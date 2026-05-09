import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import * as faceapi from "face-api.js";
import {
  Eye,
  ArrowLeftRight,
  Smile,
  Camera,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface LivenessCaptureProps {
  userId: string;
  mode: "kyc" | "agent-onboarding";
  onSuccess: (result: LivenessResult) => void;
  onFailure: (reason: string) => void;
}

export interface LivenessResult {
  userId: string;
  sessionId: string;
  challenges: {
    blink: boolean;
    headTurn: boolean;
    smile: boolean;
  };
  attemptCount: number;
  capturedFrame: string; // base64 JPEG
  antiFraudFlags: string[];
  completedAt: string;
}

type Stage =
  | "loading"
  | "permission"
  | "permission-denied"
  | "precheck"
  | "challenge"
  | "capture"
  | "submitting"
  | "success"
  | "failure";

type Challenge = "blink" | "headTurn" | "smile";

interface ChallengeConfig {
  key: Challenge;
  label: string;
  instruction: string;
  icon: React.ReactNode;
  color: string;
}

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CHALLENGES: ChallengeConfig[] = [
  {
    key: "blink",
    label: "Blink",
    instruction: "Close your eyes slowly, then open",
    icon: <Eye className="w-8 h-8" />,
    color: "#3B82F6",
  },
  {
    key: "headTurn",
    label: "Turn Head",
    instruction: "Nod your face slightly left and right",
    icon: <ArrowLeftRight className="w-8 h-8" />,
    color: "#8B5CF6",
  },
  {
    key: "smile",
    label: "Lips",
    instruction: "Gently move your lips",
    icon: <Smile className="w-8 h-8" />,
    color: "#EC1B84",
  },
];

const MAX_ATTEMPTS = 3;
const MODELS_PATH = "/models";
const DETECTION_INTERVAL_MS = 50;
const CHALLENGE_TIMEOUT_MS = 12000;

// Blink: detect a dip in EAR from a recent “open” peak — catches partial / quick blinks.
const BLINK_MIN_OPEN_EAR = 0.17; // need some baseline before we trust a dip
const BLINK_DIP_FROM_PEAK = 0.04; // small drop counts (partial blink)
const BLINK_RECOVER_WITHIN = 0.04; // recovered = back near peak → one blink
const BLINK_WARMUP_FRAMES = 5;
const BLINKS_REQUIRED = 1;
/** Only update on-screen hints when EAR suggests eyes are open enough to read text */
const EAR_FEEDBACK_VISIBLE_MIN = 0.26;

// Head: blend yaw (nose vs eye mid) + jaw metric; min/max range — order & mirror agnostic.
const HEAD_SWING_THRESHOLD = 0.035; // each way from neutral — very small turn passes
const HEAD_WARMUP_FRAMES = 10;
const HEAD_BLEND_YAW = 0.62;
const HEAD_BLEND_JAW = 0.38;

// Mouth: subtle movement vs short baseline (not a “big smile”).
const MOUTH_BASELINE_FRAMES = 10;
const MOUTH_DELTA_PASS = 0.02;
const MOUTH_NEAR_DELTA = 0.008;
const MOUTH_SUSTAINED_FRAMES = 5;
const MOUTH_EMA_ALPHA = 0.25;

// Anti-fraud (keep light — avoid failing real users)
const FACE_DISAPPEAR_THRESHOLD_MS = 2200;

const FACE_MIN_CONFIDENCE = 0.38;

// â”€â”€â”€ Helper: generate UUID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// â”€â”€â”€ Helper: Eye Aspect Ratio â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
// Landmark indices for left eye:  [36,37,38,39,40,41]
// Landmark indices for right eye: [42,43,44,45,46,47]

function dist(a: faceapi.Point, b: faceapi.Point): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

function computeEAR(
  pts: faceapi.Point[],
  p1: number,
  p2: number,
  p3: number,
  p4: number,
  p5: number,
  p6: number,
): number {
  return (
    (dist(pts[p2], pts[p6]) + dist(pts[p3], pts[p5])) /
    (2 * dist(pts[p1], pts[p4]))
  );
}

function getEAR(landmarks: faceapi.FaceLandmarks68): number {
  const pts = landmarks.positions;
  const leftEAR = computeEAR(pts, 36, 37, 38, 39, 40, 41);
  const rightEAR = computeEAR(pts, 42, 43, 44, 45, 46, 47);
  return (leftEAR + rightEAR) / 2;
}

// â”€â”€â”€ Helper: Nose tip deviation for head turn â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getNoseTipDeviation(landmarks: faceapi.FaceLandmarks68): number {
  const pts = landmarks.positions;
  const noseTip = pts[30];
  const leftJaw = pts[2];
  const rightJaw = pts[14];
  const leftDistance = dist(noseTip, leftJaw);
  const rightDistance = dist(noseTip, rightJaw);

  if (leftDistance + rightDistance < 1) return 0;

  return (leftDistance - rightDistance) / (leftDistance + rightDistance);
}

/** Nose vs midpoint of outer eye corners, normalized by inter-eye distance — good yaw proxy. */
function getHeadYaw01(landmarks: faceapi.FaceLandmarks68): number {
  const p = landmarks.positions;
  const eyeL = p[36];
  const eyeR = p[45];
  const nose = p[30];
  const eyeMidX = (eyeL.x + eyeR.x) / 2;
  const faceW = Math.abs(eyeR.x - eyeL.x) || 1;
  return (nose.x - eyeMidX) / faceW;
}

function getCombinedHeadTurnScore(landmarks: faceapi.FaceLandmarks68): number {
  return (
    HEAD_BLEND_YAW * getHeadYaw01(landmarks) +
    HEAD_BLEND_JAW * getNoseTipDeviation(landmarks)
  );
}

/** Lip / mouth motion (corners + vertical opening) — sensitive to subtle movement. */
function getMouthMotionScore(landmarks: faceapi.FaceLandmarks68): number {
  const p = landmarks.positions;
  const eyeD = dist(p[36], p[45]);
  if (eyeD < 1) return 0;
  const cornerW = dist(p[48], p[54]);
  const openH = dist(p[51], p[57]);
  return (cornerW * 0.45 + openH * 1.25) / eyeD;
}

// â”€â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Step {current} of {total}
        </span>
        <span className="text-xs font-bold text-[#EC1B84]">
          {Math.round((current / total) * 100)}%
        </span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-[#EC1B84] to-rose-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${(current / total) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function ChallengeIcon({
  challenge,
  isActive,
  isComplete,
}: {
  challenge: ChallengeConfig;
  isActive: boolean;
  isComplete: boolean;
}) {
  return (
    <motion.div
      animate={
        isActive
          ? {
              scale: [1, 1.1, 1],
              transition: { repeat: Infinity, duration: 1.5 },
            }
          : {}
      }
      className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
        isComplete
          ? "bg-green-100 text-green-600"
          : isActive
            ? "text-white shadow-lg"
            : "bg-gray-100 text-gray-400",
      )}
      style={isActive ? { backgroundColor: challenge.color } : {}}
    >
      {isComplete ? (
        <CheckCircle2 className="w-6 h-6" />
      ) : (
        <span className="w-6 h-6">{challenge.icon}</span>
      )}
    </motion.div>
  );
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function LivenessCapture({
  userId,
  mode,
  onSuccess,
  onFailure,
}: LivenessCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const stageRef = useRef<Stage>("loading");

  // Detection state refs (avoid stale closures in rAF loop)
  const blinkCountRef = useRef(0);
  const blinkWarmupFramesRef = useRef(0);
  const blinkMaxOpenEarRef = useRef(0);
  const blinkInDipRef = useRef(false);
  const blinkPeakAtDipRef = useRef(0);
  const blinkStuckFramesRef = useRef(0);

  const headScoreMinRef = useRef(Number.POSITIVE_INFINITY);
  const headScoreMaxRef = useRef(Number.NEGATIVE_INFINITY);
  const headWarmupFramesRef = useRef(0);

  const mouthMotionFramesRef = useRef(0);
  const baselineMouthRef = useRef<number | null>(null);
  const mouthBaselineSamplesRef = useRef<number[]>([]);
  const mouthEmaRef = useRef<number | null>(null);
  const advanceInFlightRef = useRef(false);
  const challengeIdxRef = useRef(0);
  const completedSetRef = useRef<Set<Challenge>>(new Set());
  const attemptCountRef = useRef(0);
  const faceDisappearRef = useRef<number | null>(null);
  const challengeStartTimeRef = useRef<number>(0);
  const tabHiddenRef = useRef(false);
  const debugLogAtRef = useRef(0);

  const [stage, setStage] = useState<Stage>("loading");
  const [currentChallengeIdx, setCurrentChallengeIdx] = useState(0);
  const [completedChallenges, setCompletedChallenges] = useState<
    Set<Challenge>
  >(new Set());
  const [attemptCount, setAttemptCount] = useState(0);
  const [sessionId] = useState(generateUUID());
  const [capturedFrame, setCapturedFrame] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  const [headTurnProgress, setHeadTurnProgress] = useState(0);
  const [antiFraudFlags, setAntiFraudFlags] = useState<string[]>([]);
  const [countdownMs, setCountdownMs] = useState(CHALLENGE_TIMEOUT_MS);
  const [canRetry, setCanRetry] = useState(true);
  const headUiTickRef = useRef(0);

  const currentChallenge = CHALLENGES[currentChallengeIdx];

  const debugGesture = useCallback((payload: Record<string, unknown>) => {
    if (!import.meta.env.DEV) return;

    const now = Date.now();
    if (now - debugLogAtRef.current < 250) return;
    debugLogAtRef.current = now;

  }, []);

  useEffect(() => {
    if (!currentChallenge) return;

    debugGesture({
      event: "challenge-enter",
      challenge: currentChallenge.key,
      challengeIndex: currentChallengeIdx,
    });

    if (currentChallenge.key === "blink") {
      blinkCountRef.current = 0;
      blinkWarmupFramesRef.current = 0;
      blinkMaxOpenEarRef.current = 0;
      blinkInDipRef.current = false;
      blinkPeakAtDipRef.current = 0;
      blinkStuckFramesRef.current = 0;
    }

    if (currentChallenge.key === "headTurn") {
      headScoreMinRef.current = Number.POSITIVE_INFINITY;
      headScoreMaxRef.current = Number.NEGATIVE_INFINITY;
      headWarmupFramesRef.current = 0;
      setHeadTurnProgress(0);
    }

    if (currentChallenge.key === "smile") {
      mouthMotionFramesRef.current = 0;
      baselineMouthRef.current = null;
      mouthBaselineSamplesRef.current = [];
      mouthEmaRef.current = null;
    }

    if (currentChallenge.key === "blink") {
      setFeedbackMessage(
        "Slowly close your eyes, then reopen — don't rush it",
      );
      return;
    }

    if (currentChallenge.key === "headTurn") {
      setFeedbackMessage("Turn gently both ways — small movements count");
      return;
    }

    if (currentChallenge.key === "smile") {
      setFeedbackMessage("Hold neutral, then gently move your lips");
    }
  }, [currentChallenge, currentChallengeIdx, debugGesture]);

  // Keep stageRef in sync
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    if (stage !== "challenge") return;

    setCountdownMs(CHALLENGE_TIMEOUT_MS);
    const timer = window.setInterval(() => {
      const remaining = Math.max(
        0,
        CHALLENGE_TIMEOUT_MS - (Date.now() - challengeStartTimeRef.current),
      );
      setCountdownMs(remaining);
    }, 100);

    return () => window.clearInterval(timer);
  }, [stage, currentChallengeIdx, attemptCount]);

  // â”€â”€â”€ Tab visibility tracking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    const handleVisibility = () => {
      if (
        document.visibilityState === "hidden" &&
        stageRef.current === "challenge"
      ) {
        tabHiddenRef.current = true;
        setAntiFraudFlags((prev) => [...prev, `tab_hidden_at_${Date.now()}`]);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // â”€â”€â”€ Camera â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;

    if (!video || !stream) return;

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    void video.play().catch(() => {
      // The current stage may mount a fresh video element after permission was
      // granted. Retry silence is fine here; the stream remains attached.
    });
  }, [stage]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStage("precheck");
    } catch (err: any) {
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        setStage("permission-denied");
      } else {
        // DEV bypass — skip camera and proceed to precheck
        if (import.meta.env.DEV) {
          setStage("precheck");
          return;
        }
        setErrorMessage("Camera not available on this device.");
        setStage("failure");
      }
    }
  }, []);

  // â”€â”€â”€ Model loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS_PATH),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_PATH),
        ]);
        setStage("permission");
      } catch (e) {
        console.error("Failed to load face-api models", e);
        // Still proceed
        setStage("permission");
      }
    };
    loadModels();
  }, []);

  // â”€â”€â”€ Challenge Timer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // â”€â”€â”€ Capture Frame â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const captureFrame = useCallback((): string => {
    if (!videoRef.current || !canvasRef.current) return "";
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
  }, []);

  const failAttempt = useCallback(
    (reason: string, message: string) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      const reachedMax = attemptCountRef.current >= MAX_ATTEMPTS;
      setCapturedFrame("");
      setErrorMessage(message);
      setCanRetry(!reachedMax);
      setStage("failure");

      if (reachedMax) {
        stopCamera();
        onFailure("max_attempts_reached");
        return;
      }

      if (reason !== "challenge_timeout") {
        setAntiFraudFlags((prev) =>
          prev.includes(reason) ? prev : [...prev, reason],
        );
      }
    },
    [onFailure, stopCamera],
  );

  // â”€â”€â”€ Challenge Advance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const advanceChallenge = useCallback(() => {
    if (advanceInFlightRef.current) return;
    advanceInFlightRef.current = true;

    const challenge = CHALLENGES[challengeIdxRef.current].key;

    // Anti-fraud: only flag implausibly instant completes (still allow quick natural gestures)
    const elapsed = Date.now() - challengeStartTimeRef.current;
    if (elapsed < 350) {
      setAntiFraudFlags((prev) => [
        ...prev,
        `fast_completion_${challenge}_${elapsed}ms`,
      ]);
    }

    const newCompleted = new Set(completedSetRef.current);
    newCompleted.add(challenge);
    completedSetRef.current = newCompleted;
    setCompletedChallenges(new Set(newCompleted));

    if (newCompleted.size === CHALLENGES.length) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setStage("capture");
      const frame = captureFrame();
      setCapturedFrame(frame);
      stopCamera();

      setTimeout(() => {
        setStage("submitting");
        setTimeout(() => {
          setStage("success");
          onSuccess({
            userId,
            sessionId,
            challenges: { blink: true, headTurn: true, smile: true },
            attemptCount: attemptCountRef.current,
            capturedFrame: frame,
            antiFraudFlags,
            completedAt: new Date().toISOString(),
          });
        }, 900);
      }, 350);
    } else {
      blinkCountRef.current = 0;
      blinkWarmupFramesRef.current = 0;
      blinkMaxOpenEarRef.current = 0;
      blinkInDipRef.current = false;
      blinkPeakAtDipRef.current = 0;
      blinkStuckFramesRef.current = 0;
      headScoreMinRef.current = Number.POSITIVE_INFINITY;
      headScoreMaxRef.current = Number.NEGATIVE_INFINITY;
      headWarmupFramesRef.current = 0;
      mouthMotionFramesRef.current = 0;
      baselineMouthRef.current = null;
      mouthBaselineSamplesRef.current = [];
      mouthEmaRef.current = null;
      challengeIdxRef.current += 1;
      setCurrentChallengeIdx(challengeIdxRef.current);
      setHeadTurnProgress(0);
      const nextChallenge = CHALLENGES[challengeIdxRef.current];
      if (nextChallenge?.key === "blink") {
        setFeedbackMessage(
          "Slowly close your eyes, then reopen — don't rush it",
        );
      } else if (nextChallenge?.key === "headTurn") {
        setFeedbackMessage("Turn gently both ways — small movements count");
      } else if (nextChallenge?.key === "smile") {
        setFeedbackMessage("Hold neutral, then gently move your lips");
      }
      challengeStartTimeRef.current = Date.now();
    }

    queueMicrotask(() => {
      advanceInFlightRef.current = false;
    });
  }, [antiFraudFlags, captureFrame, onSuccess, sessionId, stopCamera, userId]);

  // â”€â”€â”€ Detection Loop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const runDetectionLoop = useCallback(async () => {
    if (stageRef.current !== "challenge") return;
    if (!videoRef.current || videoRef.current.readyState < 2) {
      rafRef.current = requestAnimationFrame(
        runDetectionLoop,
      ) as unknown as number;
      return;
    }

    try {
      const detections = await faceapi
        .detectAllFaces(
          videoRef.current,
          new faceapi.SsdMobilenetv1Options({
            minConfidence: FACE_MIN_CONFIDENCE,
          }),
        )
        .withFaceLandmarks();

      // â”€â”€ Anti-fraud: multiple faces â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (detections.length > 1) {
        failAttempt(
          "multiple_faces",
          "Multiple faces were detected. Please try again with only the customer in frame.",
        );
        return;
      }

      // â”€â”€ Anti-fraud: face disappears â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (detections.length === 0) {
        if (Date.now() - challengeStartTimeRef.current >= CHALLENGE_TIMEOUT_MS) {
          failAttempt(
            "challenge_timeout",
            "That step took too long. Let's try the liveness check again.",
          );
          return;
        }
        if (!faceDisappearRef.current) {
          faceDisappearRef.current = Date.now();
        } else if (
          Date.now() - faceDisappearRef.current >
          FACE_DISAPPEAR_THRESHOLD_MS
        ) {
          setAntiFraudFlags((prev) => [
            ...prev,
            `face_disappeared_${Date.now()}`,
          ]);
          faceDisappearRef.current = null;
        }
        rafRef.current = requestAnimationFrame(
          runDetectionLoop,
        ) as unknown as number;
        return;
      }

      faceDisappearRef.current = null;
      if (Date.now() - challengeStartTimeRef.current >= CHALLENGE_TIMEOUT_MS) {
        failAttempt(
          "challenge_timeout",
          "That step took too long. Let's try the liveness check again.",
        );
        return;
      }
      const { landmarks } = detections[0];
      const currentKey = CHALLENGES[challengeIdxRef.current].key;

      // â”€â”€ Blink: dip-from-peak (partial blinks count); text only when eyes likely open enough to read
      if (currentKey === "blink") {
        const ear = getEAR(landmarks);

        if (blinkInDipRef.current) {
          blinkStuckFramesRef.current += 1;
          if (blinkStuckFramesRef.current > 48) {
            blinkInDipRef.current = false;
            blinkStuckFramesRef.current = 0;
            blinkPeakAtDipRef.current = 0;
          }
        } else {
          blinkStuckFramesRef.current = 0;
        }

        if (blinkWarmupFramesRef.current < BLINK_WARMUP_FRAMES) {
          blinkWarmupFramesRef.current += 1;
          blinkMaxOpenEarRef.current = Math.max(
            blinkMaxOpenEarRef.current,
            ear,
          );
        } else if (!blinkInDipRef.current) {
          blinkMaxOpenEarRef.current = Math.max(
            blinkMaxOpenEarRef.current,
            ear,
          );
          if (
            blinkMaxOpenEarRef.current >= BLINK_MIN_OPEN_EAR &&
            blinkMaxOpenEarRef.current - ear >= BLINK_DIP_FROM_PEAK
          ) {
            blinkInDipRef.current = true;
            blinkPeakAtDipRef.current = blinkMaxOpenEarRef.current;
          }
        } else if (ear >= blinkPeakAtDipRef.current - BLINK_RECOVER_WITHIN) {
          blinkCountRef.current += 1;
          blinkInDipRef.current = false;
          blinkPeakAtDipRef.current = 0;
          blinkMaxOpenEarRef.current = ear;
          blinkStuckFramesRef.current = 0;
        }

        debugGesture({
          challenge: "blink",
          ear: Number(ear.toFixed(4)),
          blinkCount: blinkCountRef.current,
          inDip: blinkInDipRef.current,
          peakAtDip: Number(blinkPeakAtDipRef.current.toFixed(4)),
          maxOpen: Number(blinkMaxOpenEarRef.current.toFixed(4)),
        });

        if (ear >= EAR_FEEDBACK_VISIBLE_MIN) {
          if (blinkCountRef.current >= BLINKS_REQUIRED) {
            setFeedbackMessage("Got it");
          } else if (!blinkInDipRef.current) {
            setFeedbackMessage("Slowly close your eyes, then open");
          }
        }

        if (blinkCountRef.current >= BLINKS_REQUIRED) {
          advanceChallenge();
          setTimeout(() => {
            if (stageRef.current === "challenge") {
              rafRef.current = requestAnimationFrame(
                runDetectionLoop,
              ) as unknown as number;
            }
          }, 250);
          return;
        }
      }

      // â”€â”€ Head: track min/max blend score — both directions required; mirror / order independent
      if (currentKey === "headTurn") {
        const score = getCombinedHeadTurnScore(landmarks);
        if (headWarmupFramesRef.current < HEAD_WARMUP_FRAMES) {
          headWarmupFramesRef.current += 1;
        } else {
        headScoreMinRef.current = Math.min(headScoreMinRef.current, score);
        headScoreMaxRef.current = Math.max(headScoreMaxRef.current, score);

        const need = HEAD_SWING_THRESHOLD;
        const gotLeft = headScoreMinRef.current <= -need;
        const gotRight = headScoreMaxRef.current >= need;

        headUiTickRef.current += 1;
        if (headUiTickRef.current % 3 === 0) {
          const lProg = gotLeft
            ? 1
            : Math.min(
                1,
                Math.abs(Math.min(0, headScoreMinRef.current)) / need,
              );
          const rProg = gotRight
            ? 1
            : Math.min(1, Math.max(0, headScoreMaxRef.current) / need);
          setHeadTurnProgress(Math.round(((lProg + rProg) / 2) * 100));
        }

        debugGesture({
          challenge: "headTurn",
          score: Number(score.toFixed(4)),
          min: Number(headScoreMinRef.current.toFixed(4)),
          max: Number(headScoreMaxRef.current.toFixed(4)),
          need,
          gotLeft,
          gotRight,
        });

        if (gotLeft && !gotRight) {
          setFeedbackMessage("Good — now tilt a little the other way");
        } else if (!gotLeft && gotRight) {
          setFeedbackMessage("Good — now tilt a little the other way");
        } else if (!gotLeft && !gotRight) {
          setFeedbackMessage("Turn gently — the bar shows if we see movement");
        }

        if (gotLeft && gotRight) {
          advanceChallenge();
          setTimeout(() => {
            if (stageRef.current === "challenge") {
              rafRef.current = requestAnimationFrame(
                runDetectionLoop,
              ) as unknown as number;
            }
          }, 250);
          return;
        }
        }
      }

      // â”€â”€ Lips / mouth: subtle movement vs neutral baseline
      if (currentKey === "smile") {
        const raw = getMouthMotionScore(landmarks);
        const prev = mouthEmaRef.current;
        const smoothed =
          prev === null
            ? raw
            : prev * (1 - MOUTH_EMA_ALPHA) + raw * MOUTH_EMA_ALPHA;
        mouthEmaRef.current = smoothed;

        if (baselineMouthRef.current === null) {
          mouthBaselineSamplesRef.current.push(smoothed);
          debugGesture({
            challenge: "mouth",
            phase: "baseline",
            score: Number(smoothed.toFixed(4)),
            samples: mouthBaselineSamplesRef.current.length,
          });

          if (mouthBaselineSamplesRef.current.length < MOUTH_BASELINE_FRAMES) {
            setFeedbackMessage("Hold a neutral face…");
          } else {
            const samples = mouthBaselineSamplesRef.current;
            baselineMouthRef.current =
              samples.reduce((a, b) => a + b, 0) / samples.length;
            setFeedbackMessage("Now gently move your lips");
          }
        }

        const baseline = baselineMouthRef.current;
        if (baseline !== null) {
          let delta = smoothed - baseline;
          let movement = Math.abs(delta);

          // 🔥 Ignore noise (VERY IMPORTANT)
          if (movement < 0.006) {
            movement = 0;
          }

          debugGesture({
            challenge: "mouth",
            phase: "live",
            smoothed: Number(smoothed.toFixed(4)),
            baseline: Number(baseline.toFixed(4)),
            delta: Number(delta.toFixed(4)),
            movement: Number(movement.toFixed(4)),
            frames: mouthMotionFramesRef.current,
          });

          if (movement > MOUTH_DELTA_PASS) {
            mouthMotionFramesRef.current += 1;
            setFeedbackMessage("Got it");
          } else if (movement > MOUTH_NEAR_DELTA) {
            mouthMotionFramesRef.current = 0; // 🔥 reset
            setFeedbackMessage("A little more lip movement");
          } else {
            mouthMotionFramesRef.current = 0; // 🔥 reset (CRITICAL)
            setFeedbackMessage("Small lip movement — purse, smile, or relax");
          }

          if (mouthMotionFramesRef.current >= MOUTH_SUSTAINED_FRAMES) {
            advanceChallenge();
            setTimeout(() => {
              if (stageRef.current === "challenge") {
                rafRef.current = requestAnimationFrame(
                  runDetectionLoop,
                ) as unknown as number;
              }
            }, 250);
            return;
          }
        }
      }
    } catch (e) {
      // Detection error — skip this frame
    }

    if (stageRef.current === "challenge") {
      setTimeout(() => {
        rafRef.current = requestAnimationFrame(
          runDetectionLoop,
        ) as unknown as number;
      }, DETECTION_INTERVAL_MS);
    }
  }, [advanceChallenge, debugGesture, failAttempt]);

  // â”€â”€â”€ Start challenges â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const startChallenges = useCallback(() => {
    if (attemptCountRef.current >= MAX_ATTEMPTS) {
      setCanRetry(false);
      setErrorMessage(
        "Maximum attempts reached. This verification will need manual review.",
      );
      setStage("failure");
      onFailure("max_attempts_reached");
      return;
    }

    attemptCountRef.current += 1;
    setAttemptCount(attemptCountRef.current);
    setCanRetry(attemptCountRef.current < MAX_ATTEMPTS);
    advanceInFlightRef.current = false;
    blinkCountRef.current = 0;
    blinkWarmupFramesRef.current = 0;
    blinkMaxOpenEarRef.current = 0;
    blinkInDipRef.current = false;
    blinkPeakAtDipRef.current = 0;
    blinkStuckFramesRef.current = 0;
    headScoreMinRef.current = Number.POSITIVE_INFINITY;
    headScoreMaxRef.current = Number.NEGATIVE_INFINITY;
    headWarmupFramesRef.current = 0;
    mouthMotionFramesRef.current = 0;
    baselineMouthRef.current = null;
    mouthBaselineSamplesRef.current = [];
    mouthEmaRef.current = null;
    challengeIdxRef.current = 0;
    setHeadTurnProgress(0);
    completedSetRef.current = new Set();
    setCompletedChallenges(new Set());
    setCurrentChallengeIdx(0);
    setErrorMessage("");
    setCapturedFrame("");
    setStage("challenge");
    stageRef.current = "challenge";
    challengeStartTimeRef.current = Date.now();
    faceDisappearRef.current = null;
    setTimeout(() => {
      rafRef.current = requestAnimationFrame(
        runDetectionLoop,
      ) as unknown as number;
    }, 180);
  }, [onFailure, runDetectionLoop]);

  // â”€â”€â”€ DEV: Manual challenge completion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


  // â”€â”€â”€ Render: Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (stage === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="w-12 h-12 rounded-full border-4 border-[#EC1B84]/20 border-t-[#EC1B84]"
        />
        <p className="text-sm font-medium text-gray-500">
          Loading verification models...
        </p>
      </div>
    );
  }

  // â”€â”€â”€ Render: Permission Request â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (stage === "permission") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 py-4"
      >
        <div className="text-center space-y-3">
          <div className="w-20 h-20 bg-[#EC1B84]/10 rounded-full flex items-center justify-center mx-auto">
            <Camera className="w-10 h-10 text-[#EC1B84]" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">
            Camera Access Required
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed px-4">
            We need access to your camera to verify you're a real person. No
            photos are stored without your consent.
          </p>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
          {[
            "Make sure you're in a well-lit area",
            "Remove glasses if possible",
            "Keep your face centered in frame",
            "Complete 3 simple challenges",
          ].map((tip, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-[#EC1B84]/10 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-[#EC1B84]">
                  {i + 1}
                </span>
              </div>
              <p className="text-sm text-gray-600 font-medium">{tip}</p>
            </div>
          ))}
        </div>

        <Button
          onClick={startCamera}
          className="w-full h-12 rounded-full bg-[#EC1B84] text-white font-bold hover:bg-[#D41574]"
        >
          <Camera className="w-4 h-4 mr-2" /> Allow Camera Access
        </Button>
      </motion.div>
    );
  }

  // â”€â”€â”€ Render: Permission Denied â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (stage === "permission-denied") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 py-4 text-center"
      >
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Camera Access Denied
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed px-4">
            Please enable camera access in your browser settings and try again.
          </p>
        </div>
        <Button
          onClick={() => setStage("permission")}
          variant="outline"
          className="w-full h-12 rounded-full font-bold"
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Try Again
        </Button>
      </motion.div>
    );
  }

  // â”€â”€â”€ Render: Pre-check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (stage === "precheck") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 py-4"
      >
        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Ready to Verify
          </h3>
          <p className="text-sm text-gray-500">
            Complete 3 challenges to confirm your identity
          </p>
        </div>

        <div className="space-y-3">
          {CHALLENGES.map((c, i) => (
            <div
              key={c.key}
              className="flex items-center gap-4 p-3 bg-gray-50 rounded-2xl border border-gray-100"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: c.color }}
              >
                {c.icon}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">
                  Step {i + 1}: {c.label}
                </p>
                <p className="text-xs text-gray-500">{c.instruction}</p>
              </div>
            </div>
          ))}
        </div>

        {mode === "agent-onboarding" && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
              Agent Note
            </p>
            <p className="text-sm text-blue-600">
              Point the camera at the customer and guide them through each
              challenge.
            </p>
          </div>
        )}

        <Button
          onClick={startChallenges}
          className="w-full h-12 rounded-full bg-[#EC1B84] text-white font-bold hover:bg-[#D41574]"
        >
          I'm Ready — Start Verification
        </Button>
      </motion.div>
    );
  }

  // â”€â”€â”€ Render: Challenge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (stage === "challenge") {
    const currentStep = currentChallengeIdx + 1;
    const secondsRemaining = Math.max(1, Math.ceil(countdownMs / 1000));

    return (
      <div className="relative min-h-[78vh] overflow-hidden rounded-[36px] bg-black text-white shadow-2xl shadow-black/30">
        <div className="absolute inset-0">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover scale-x-[-1]"
          />
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/75 via-black/35 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
        </div>

        <div className="relative z-10 flex min-h-[78vh] flex-col px-5 pb-6 pt-6 sm:px-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-white/70 backdrop-blur-md">
                Step {currentStep} of {CHALLENGES.length}
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white/70 backdrop-blur-md">
                  Attempt {attemptCount}/{MAX_ATTEMPTS}
                </div>
                <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white/70 backdrop-blur-md">
                  {secondsRemaining}s left
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {CHALLENGES.map((c, i) => {
                const isActive = i === currentChallengeIdx;
                const isComplete = completedChallenges.has(c.key);

                return (
                  <div
                    key={c.key}
                    className={cn(
                      "h-1.5 flex-1 rounded-full transition-all duration-300",
                      isComplete
                        ? "bg-[#EC1B84]"
                        : isActive
                          ? "bg-white"
                          : "bg-white/20",
                    )}
                  />
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentChallengeIdx}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mx-auto max-w-xs text-center"
              >
                <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#EC1B84]">
                  {currentChallenge.label}
                </p>
                <h3 className="mt-2 text-2xl font-bold tracking-tight text-white">
                  {currentChallenge.instruction}
                </h3>
                <p className="mt-2 text-sm font-medium text-white/65">
                  Keep your face inside the oval while we verify this step.
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex flex-1 items-center justify-center py-8">
            <div className="relative flex w-full items-center justify-center">
              <div
                className="pointer-events-none relative h-[380px] w-[255px] max-h-[52vh] max-w-[72vw] rounded-[999px] border-[5px] border-white/95"
                style={{
                  boxShadow:
                    "0 0 0 999px rgba(0,0,0,0.46), 0 0 0 18px rgba(255,255,255,0.08), 0 0 60px rgba(0,0,0,0.35)",
                }}
              >
                <div className="absolute inset-[10px] rounded-[999px] border border-white/15" />
                <motion.div
                  className="absolute -inset-[8px] rounded-[999px] border-[3px] border-[#EC1B84]/85"
                  animate={{
                    opacity: [0.35, 1, 0.35],
                    scale: [0.99, 1.01, 0.99],
                  }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="mx-auto w-full max-w-xs rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-center backdrop-blur-xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#EC1B84]">
                Live feedback
              </p>
              <p className="mt-1 text-sm font-medium text-white/90">
                {feedbackMessage || "Follow the instruction to begin"}
              </p>
              {currentChallenge?.key === "headTurn" && (
                <div className="mt-3 space-y-1.5 text-left">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
                    <span>Movement detected</span>
                    <span>{headTurnProgress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/12">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-400 to-[#EC1B84] transition-[width] duration-200 ease-out"
                      style={{ width: `${headTurnProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mx-auto flex w-full max-w-xs items-center gap-2 rounded-2xl border border-amber-400/25 bg-amber-500/15 p-3 text-left backdrop-blur-xl"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
                  <p className="text-sm font-medium text-amber-50">
                    {errorMessage}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {mode === "agent-onboarding" && (
              <div className="mx-auto w-full max-w-xs rounded-2xl border border-sky-400/20 bg-sky-500/10 p-3 backdrop-blur-xl">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-200">
                  Agent status
                </p>
                <p className="mt-1 text-sm font-medium text-sky-50/90">
                  Pending challenge: {currentChallenge.label}. Keep the customer
                  centered and finish within {secondsRemaining} seconds.
                </p>
              </div>
            )}

          </div>

          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>
    );
  }

  if (stage === "submitting") {
    return (
      <div className="relative min-h-[78vh] overflow-hidden rounded-[36px] bg-black text-white shadow-2xl shadow-black/30">
        {capturedFrame && (
          <img
            src={`data:image/jpeg;base64,${capturedFrame}`}
            alt="Captured frame"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black/65" />
        <div className="relative z-10 flex min-h-[78vh] flex-col items-center justify-center px-6 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="mb-6 h-16 w-16 rounded-full border-4 border-[#EC1B84]/25 border-t-[#EC1B84]"
          />
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#EC1B84]">
            Finalizing
          </p>
          <h3 className="mt-3 text-3xl font-bold tracking-tight text-white">
            Hold steady for a moment
          </h3>
          <p className="mt-3 max-w-xs text-sm font-medium leading-relaxed text-white/70">
            We’re securing your liveness verification and preparing the result.
          </p>
        </div>
      </div>
    );
  }

  if (stage === "success") {
    return (
      <div className="relative min-h-[78vh] overflow-hidden rounded-[36px] bg-black text-white shadow-2xl shadow-black/30">
        {capturedFrame && (
          <img
            src={`data:image/jpeg;base64,${capturedFrame}`}
            alt="Captured frame"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/60 to-black/75" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 flex min-h-[78vh] flex-col items-center justify-center px-6 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#EC1B84]/18 ring-1 ring-[#EC1B84]/35 backdrop-blur-xl"
          >
            <ShieldCheck className="h-10 w-10 text-[#EC1B84]" />
          </motion.div>
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#EC1B84]">
            Verified
          </p>
          <h3 className="mt-3 text-3xl font-bold tracking-tight text-white">
            Liveness confirmed
          </h3>
          <p className="mt-3 max-w-xs text-sm font-medium leading-relaxed text-white/70">
            Your identity check is complete. We’ll return you to the form now.
          </p>
        </motion.div>
      </div>
    );
  }

  if (stage === "failure") {
    return (
      <div className="relative min-h-[78vh] overflow-hidden rounded-[36px] bg-black text-white shadow-2xl shadow-black/30">
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/75 to-black/85" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 flex min-h-[78vh] flex-col items-center justify-center px-6 text-center"
        >
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/12 ring-1 ring-red-400/20 backdrop-blur-xl">
            <XCircle className="h-10 w-10 text-red-300" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-red-300">
            Verification failed
          </p>
          <h3 className="mt-3 text-3xl font-bold tracking-tight text-white">
            We couldn’t complete the capture
          </h3>
          <p className="mt-3 max-w-xs text-sm font-medium leading-relaxed text-white/70">
            {errorMessage}
          </p>
          <p className="mt-5 text-xs font-medium uppercase tracking-[0.18em] text-white/45">
            Your application may be flagged for manual review
          </p>
          <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
            {canRetry && (
              <Button
                onClick={startChallenges}
                className="h-12 rounded-full bg-[#EC1B84] font-bold text-white hover:bg-[#D41574]"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Verification
              </Button>
            )}
            {!canRetry && (
              <p className="text-sm font-medium text-white/60">
                Retry is now disabled because the session has reached the maximum
                number of attempts.
              </p>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}
