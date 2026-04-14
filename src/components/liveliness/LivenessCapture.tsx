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

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LivenessCaptureProps {
  userId: string;
  mode: "kyc" | "agent-onboarding";
  onSuccess: (result: LivenessResult) => void;
  onFailure: (reason: string) => void;
}

export interface LivenessResult {
  sessionId: string;
  challenges: {
    blink: boolean;
    headTurn: boolean;
    smile: boolean;
  };
  attemptCount: number;
  capturedFrame: string; // base64 JPEG
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

// ─── Constants ────────────────────────────────────────────────────────────────

const CHALLENGES: ChallengeConfig[] = [
  {
    key: "blink",
    label: "Blink",
    instruction: "Slowly blink your eyes twice",
    icon: <Eye className="w-8 h-8" />,
    color: "#3B82F6",
  },
  {
    key: "headTurn",
    label: "Turn Head",
    instruction: "Turn your head left, then right",
    icon: <ArrowLeftRight className="w-8 h-8" />,
    color: "#8B5CF6",
  },
  {
    key: "smile",
    label: "Smile",
    instruction: "Give us a big smile!",
    icon: <Smile className="w-8 h-8" />,
    color: "#EC1B84",
  },
];

const CHALLENGE_TIMEOUT = 8; // seconds
const MAX_ATTEMPTS = 3;
const MODELS_PATH = "/models";
const DETECTION_INTERVAL_MS = 66; // ~15fps

// EAR thresholds
const EAR_BLINK_THRESHOLD = 0.21;
const EAR_BLINK_CONSECUTIVE_FRAMES = 2;
const BLINKS_REQUIRED = 2;

// Head turn threshold — nose tip must deviate > 20% of box width
const HEAD_TURN_THRESHOLD = 0.2;

// Smile threshold — mouth width-to-height ratio
const SMILE_RATIO_THRESHOLD = 2.8;
const SMILE_SUSTAINED_FRAMES = 10;

// Anti-fraud
const FACE_DISAPPEAR_THRESHOLD_MS = 1500;

// ─── Helper: generate UUID ────────────────────────────────────────────────────

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Helper: Eye Aspect Ratio ─────────────────────────────────────────────────
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

// ─── Helper: Nose tip deviation for head turn ────────────────────────────────

function getNoseTipDeviation(
  landmarks: faceapi.FaceLandmarks68,
  box: faceapi.Box,
): number {
  // Nose tip is landmark index 30
  const noseTip = landmarks.positions[30];
  const boxCenterX = box.x + box.width / 2;
  return (noseTip.x - boxCenterX) / box.width;
}

// ─── Helper: Mouth ratio for smile ───────────────────────────────────────────
// Mouth corners: 48 (left), 54 (right)
// Mouth top: 51, bottom: 57

function getSmileRatio(landmarks: faceapi.FaceLandmarks68): number {
  const pts = landmarks.positions;
  const mouthWidth = dist(pts[48], pts[54]);
  const mouthHeight = dist(pts[51], pts[57]);
  if (mouthHeight < 1) return 0;
  return mouthWidth / mouthHeight;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function CountdownTimer({
  seconds,
  total,
}: {
  seconds: number;
  total: number;
}) {
  const pct = (seconds / total) * 100;
  const isUrgent = seconds <= 3;
  return (
    <div className="relative w-14 h-14">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
        <circle
          cx="28"
          cy="28"
          r="24"
          fill="none"
          stroke="#F3F4F6"
          strokeWidth="4"
        />
        <circle
          cx="28"
          cy="28"
          r="24"
          fill="none"
          stroke={isUrgent ? "#EF4444" : "#EC1B84"}
          strokeWidth="4"
          strokeDasharray={`${2 * Math.PI * 24}`}
          strokeDashoffset={`${2 * Math.PI * 24 * (1 - pct / 100)}`}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={cn(
            "text-lg font-black",
            isUrgent ? "text-red-500" : "text-gray-800",
          )}
        >
          {seconds}
        </span>
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

// ─── Main Component ───────────────────────────────────────────────────────────

export function LivenessCapture({
  userId,
  mode,
  onSuccess,
  onFailure,
}: LivenessCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number | null>(null);
  const stageRef = useRef<Stage>("loading");

  // Detection state refs (avoid stale closures in rAF loop)
  const blinkCountRef = useRef(0);
  const earBelowThreshFrames = useRef(0);
  const headTurnedLeftRef = useRef(false);
  const headTurnedRightRef = useRef(false);
  const smileFramesRef = useRef(0);
  const challengeIdxRef = useRef(0);
  const completedSetRef = useRef<Set<Challenge>>(new Set());
  const attemptCountRef = useRef(0);
  const faceDisappearRef = useRef<number | null>(null);
  const challengeStartTimeRef = useRef<number>(0);
  const tabHiddenRef = useRef(false);

  const [stage, setStage] = useState<Stage>("loading");
  const [currentChallengeIdx, setCurrentChallengeIdx] = useState(0);
  const [completedChallenges, setCompletedChallenges] = useState<
    Set<Challenge>
  >(new Set());
  const [countdown, setCountdown] = useState(CHALLENGE_TIMEOUT);
  const [attemptCount, setAttemptCount] = useState(0);
  const [sessionId] = useState(generateUUID());
  const [capturedFrame, setCapturedFrame] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [antiFraudFlags, setAntiFraudFlags] = useState<string[]>([]);

  const currentChallenge = CHALLENGES[currentChallengeIdx];

  // Keep stageRef in sync
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  // ─── Tab visibility tracking ──────────────────────────────────────────────

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

  // ─── Camera ───────────────────────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log(devices);
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

  // ─── Model loading ────────────────────────────────────────────────────────

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

  // ─── Challenge Timer ──────────────────────────────────────────────────────

  const handleChallengeTimeout = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const newAttempt = attemptCountRef.current + 1;
    attemptCountRef.current = newAttempt;
    setAttemptCount(newAttempt);

    if (newAttempt >= MAX_ATTEMPTS) {
      stopCamera();
      setStage("failure");
      setErrorMessage(
        "Maximum attempts reached. You'll be referred for manual review.",
      );
      onFailure("max_attempts_reached");
    } else {
      setErrorMessage(
        `Time's up! ${MAX_ATTEMPTS - newAttempt} attempt${MAX_ATTEMPTS - newAttempt === 1 ? "" : "s"} remaining.`,
      );
      // Reset all challenge state
      blinkCountRef.current = 0;
      earBelowThreshFrames.current = 0;
      headTurnedLeftRef.current = false;
      headTurnedRightRef.current = false;
      smileFramesRef.current = 0;
      challengeIdxRef.current = 0;
      completedSetRef.current = new Set();
      setCompletedChallenges(new Set());
      setCurrentChallengeIdx(0);
      setCountdown(CHALLENGE_TIMEOUT);
    }
  }, [onFailure, stopCamera]);

  const startChallengeTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(CHALLENGE_TIMEOUT);
    let remaining = CHALLENGE_TIMEOUT;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        handleChallengeTimeout();
      }
    }, 1000);
  }, [handleChallengeTimeout]);

  // ─── Capture Frame ────────────────────────────────────────────────────────

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

  // ─── Challenge Advance ────────────────────────────────────────────────────

  const advanceChallenge = useCallback(() => {
    const challenge = CHALLENGES[challengeIdxRef.current].key;

    // Anti-fraud: flag suspiciously fast completion
    const elapsed = Date.now() - challengeStartTimeRef.current;
    if (elapsed < 1000) {
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
      // All done!
      if (timerRef.current) clearInterval(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setStage("capture");
      const frame = captureFrame();
      setCapturedFrame(frame);
      stopCamera();

      setTimeout(() => {
        setStage("submitting");
        // TODO: replace with real API call when backend is ready
        // POST /kyc/liveness/session then POST /kyc/liveness
        setTimeout(() => {
          setStage("success");
          onSuccess({
            sessionId,
            challenges: { blink: true, headTurn: true, smile: true },
            attemptCount: attemptCountRef.current,
            capturedFrame: frame,
          });
        }, 1500);
      }, 500);
    } else {
      // Reset per-challenge counters
      blinkCountRef.current = 0;
      earBelowThreshFrames.current = 0;
      headTurnedLeftRef.current = false;
      headTurnedRightRef.current = false;
      smileFramesRef.current = 0;
      challengeIdxRef.current += 1;
      setCurrentChallengeIdx(challengeIdxRef.current);
      // Reset timer for next challenge
      if (timerRef.current) clearInterval(timerRef.current);
      setCountdown(CHALLENGE_TIMEOUT);
      challengeStartTimeRef.current = Date.now();
      startChallengeTimer();
    }
  }, [captureFrame, stopCamera, onSuccess, sessionId, startChallengeTimer]);

  // ─── Detection Loop ───────────────────────────────────────────────────────

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
          new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }),
        )
        .withFaceLandmarks();

      // ── Anti-fraud: multiple faces ────────────────────────────────────────
      if (detections.length > 1) {
        if (timerRef.current) clearInterval(timerRef.current);
        stopCamera();
        setStage("failure");
        setErrorMessage("Multiple faces detected. Session aborted.");
        onFailure("multiple_faces");
        return;
      }

      // ── Anti-fraud: face disappears ───────────────────────────────────────
      if (detections.length === 0) {
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
      const { landmarks, detection } = detections[0];
      const box = detection.box;
      const currentKey = CHALLENGES[challengeIdxRef.current].key;

      // ── Blink detection ───────────────────────────────────────────────────
      if (currentKey === "blink") {
        const ear = getEAR(landmarks);
        if (ear < EAR_BLINK_THRESHOLD) {
          earBelowThreshFrames.current += 1;
        } else {
          if (earBelowThreshFrames.current >= EAR_BLINK_CONSECUTIVE_FRAMES) {
            blinkCountRef.current += 1;
          }
          earBelowThreshFrames.current = 0;
        }
        if (blinkCountRef.current >= BLINKS_REQUIRED) {
          advanceChallenge();
          return;
        }
      }

      // ── Head turn detection ───────────────────────────────────────────────
      if (currentKey === "headTurn") {
        const deviation = getNoseTipDeviation(landmarks, box);
        if (deviation < -HEAD_TURN_THRESHOLD) headTurnedLeftRef.current = true;
        if (deviation > HEAD_TURN_THRESHOLD) headTurnedRightRef.current = true;
        if (headTurnedLeftRef.current && headTurnedRightRef.current) {
          advanceChallenge();
          return;
        }
      }

      // ── Smile detection ───────────────────────────────────────────────────
      if (currentKey === "smile") {
        const ratio = getSmileRatio(landmarks);
        if (ratio > SMILE_RATIO_THRESHOLD) {
          smileFramesRef.current += 1;
        } else {
          smileFramesRef.current = 0;
        }
        if (smileFramesRef.current >= SMILE_SUSTAINED_FRAMES) {
          advanceChallenge();
          return;
        }
      }
    } catch (e) {
      // Detection error — just skip this frame
    }

    if (stageRef.current === "challenge") {
      setTimeout(() => {
        rafRef.current = requestAnimationFrame(
          runDetectionLoop,
        ) as unknown as number;
      }, DETECTION_INTERVAL_MS);
    }
  }, [advanceChallenge, onFailure, stopCamera]);

  // ─── Start challenges ─────────────────────────────────────────────────────

  const startChallenges = useCallback(() => {
    setStage("challenge");
    stageRef.current = "challenge";
    challengeStartTimeRef.current = Date.now();
    startChallengeTimer();
    // Small delay to let stage update propagate before starting detection
    setTimeout(() => {
      rafRef.current = requestAnimationFrame(
        runDetectionLoop,
      ) as unknown as number;
    }, 100);
  }, [startChallengeTimer, runDetectionLoop]);

  // ─── DEV: Manual challenge completion ────────────────────────────────────

  const devCompleteChallenge = useCallback(() => {
    advanceChallenge();
  }, [advanceChallenge]);

  // ─── Render: Loading ──────────────────────────────────────────────────────

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

  // ─── Render: Permission Request ───────────────────────────────────────────

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

  // ─── Render: Permission Denied ────────────────────────────────────────────

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

  // ─── Render: Pre-check ────────────────────────────────────────────────────

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

  // ─── Render: Challenge ────────────────────────────────────────────────────

  if (stage === "challenge") {
    return (
      <div className="space-y-4">
        <ProgressBar
          current={completedChallenges.size + 1}
          total={CHALLENGES.length}
        />

        <div className="flex items-center justify-between px-2">
          {CHALLENGES.map((c, i) => (
            <div key={c.key} className="flex flex-col items-center gap-1">
              <ChallengeIcon
                challenge={c}
                isActive={i === currentChallengeIdx}
                isComplete={completedChallenges.has(c.key)}
              />
              <span
                className={cn(
                  "text-[10px] font-bold",
                  i === currentChallengeIdx
                    ? "text-gray-900"
                    : completedChallenges.has(c.key)
                      ? "text-green-600"
                      : "text-gray-400",
                )}
              >
                {c.label}
              </span>
            </div>
          ))}
        </div>

        {/* Video Feed */}
        <div className="relative rounded-3xl overflow-hidden bg-gray-900 aspect-[3/4]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />

          {/* Face guide overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-60 rounded-full border-4 border-white/60 border-dashed" />
          </div>

          {/* Challenge overlay */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentChallengeIdx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute bottom-4 left-4 right-4"
            >
              <div
                className="rounded-2xl p-4 text-white flex items-center gap-3"
                style={{
                  backgroundColor: `${currentChallenge.color}CC`,
                  backdropFilter: "blur(8px)",
                }}
              >
                <div className="shrink-0">{currentChallenge.icon}</div>
                <div className="flex-1">
                  <p className="font-black text-sm">{currentChallenge.label}</p>
                  <p className="text-xs opacity-90">
                    {currentChallenge.instruction}
                  </p>
                </div>
                <CountdownTimer seconds={countdown} total={CHALLENGE_TIMEOUT} />
              </div>
            </motion.div>
          </AnimatePresence>

          {attemptCount > 0 && (
            <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
              <p className="text-white text-xs font-bold">
                Attempt {attemptCount + 1}/{MAX_ATTEMPTS}
              </p>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl"
            >
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-sm text-amber-700 font-medium">
                {errorMessage}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {mode === "agent-onboarding" && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3">
            <p className="text-xs font-bold text-blue-700 mb-2 uppercase tracking-wider">
              Agent Panel
            </p>
            <div className="flex gap-2">
              {CHALLENGES.map((c) => (
                <div
                  key={c.key}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-center text-[10px] font-bold",
                    completedChallenges.has(c.key)
                      ? "bg-green-100 text-green-700"
                      : c.key === currentChallenge.key
                        ? "bg-blue-100 text-blue-700"
                        : "bg-white text-gray-400",
                  )}
                >
                  {completedChallenges.has(c.key) ? "✓ " : ""}
                  {c.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DEV ONLY */}
        {import.meta.env.DEV && (
          <Button
            onClick={devCompleteChallenge}
            variant="outline"
            className="w-full h-10 rounded-full text-sm font-bold border-dashed"
          >
            [DEV] Complete "{currentChallenge.label}" Challenge
          </Button>
        )}
      </div>
    );
  }

  // ─── Render: Submitting ───────────────────────────────────────────────────

  if (stage === "submitting") {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="w-12 h-12 rounded-full border-4 border-[#EC1B84]/20 border-t-[#EC1B84]"
        />
        <p className="text-sm font-medium text-gray-500">
          Submitting verification...
        </p>
      </div>
    );
  }

  // ─── Render: Success ──────────────────────────────────────────────────────

  if (stage === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-12 space-y-4 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center"
        >
          <ShieldCheck className="w-10 h-10 text-green-500" />
        </motion.div>
        <h3 className="text-xl font-bold text-gray-900">
          Liveness Verified! 🎉
        </h3>
        <p className="text-sm text-gray-500">
          Your identity has been successfully confirmed.
        </p>
      </motion.div>
    );
  }

  // ─── Render: Failure ──────────────────────────────────────────────────────

  if (stage === "failure") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-12 space-y-4 text-center"
      >
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Verification Failed
          </h3>
          <p className="text-sm text-gray-500 px-4">{errorMessage}</p>
        </div>
        <p className="text-xs text-gray-400">
          Your application has been flagged for manual review.
        </p>
      </motion.div>
    );
  }

  return null;
}
