import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, LogIn, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate loading
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    console.log("Login attempted:", { email, rememberMe });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 12,
      },
    },
  };

  const logoVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: {
      scale: 1,
      rotate: 0,
      transition: {
        type: "spring" as const,
        stiffness: 200,
        damping: 15,
      },
    },
    hover: {
      scale: 1.1,
      rotate: [0, -10, 10, -10, 0],
      transition: {
        rotate: {
          duration: 0.5,
        },
      },
    },
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-background-pink-subtle p-4 overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
      </div>

      <motion.div
        className="w-full max-w-md space-y-6 relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="text-center space-y-2" variants={itemVariants}>
          <div className="flex justify-center">
            <motion.div
              className="h-14 w-14 rounded-xl bg-gradient-pink flex items-center justify-center shadow-pink cursor-pointer"
              variants={logoVariants}
              whileHover="hover"
              whileTap={{ scale: 0.95 }}
            >
              <LogIn className="h-7 w-7 text-primary-foreground" />
            </motion.div>
          </div>
          <motion.h1 
            className="text-2xl font-bold tracking-tight"
            variants={itemVariants}
          >
            Welcome back
          </motion.h1>
          <motion.p 
            className="text-muted-foreground"
            variants={itemVariants}
          >
            Sign in to your account to continue
          </motion.p>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="backdrop-blur-sm bg-card/95 border-border/50 shadow-xl overflow-hidden">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5"
              animate={{
                opacity: [0, 0.5, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <form onSubmit={handleSubmit} className="relative">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Sign In
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                  >
                    <Sparkles className="h-4 w-4 text-primary" />
                  </motion.div>
                </CardTitle>
                <CardDescription>Enter your credentials to access your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <motion.div 
                  className="space-y-2"
                  whileFocus={{ scale: 1.01 }}
                >
                  <Label htmlFor="email">Email</Label>
                  <motion.div
                    whileTap={{ scale: 0.995 }}
                  >
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="transition-all duration-300 focus:shadow-lg focus:shadow-primary/20 focus:border-primary"
                    />
                  </motion.div>
                </motion.div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link 
                      to="/forgot-password" 
                      className="text-sm text-primary hover:underline transition-colors hover:text-primary/80"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <motion.div whileTap={{ scale: 0.995 }}>
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pr-10 transition-all duration-300 focus:shadow-lg focus:shadow-primary/20 focus:border-primary"
                      />
                    </motion.div>
                    <motion.button
                      type="button"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={showPassword ? "visible" : "hidden"}
                          initial={{ opacity: 0, rotateY: -90 }}
                          animate={{ opacity: 1, rotateY: 0 }}
                          exit={{ opacity: 0, rotateY: 90 }}
                          transition={{ duration: 0.2 }}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </motion.button>
                  </div>
                </div>
                <motion.div 
                  className="flex items-center space-x-2"
                  whileHover={{ x: 2 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="transition-all duration-200 data-[state=checked]:scale-110"
                  />
                  <Label htmlFor="remember" className="text-sm font-normal cursor-pointer select-none">
                    Remember me for 30 days
                  </Label>
                </motion.div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <motion.div 
                  className="w-full"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-pink hover:opacity-90 shadow-pink transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 relative overflow-hidden group"
                    disabled={isLoading}
                  >
                    <motion.span
                      className="absolute inset-0 bg-white/20"
                      initial={{ x: "-100%", opacity: 0 }}
                      whileHover={{ x: "100%", opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    />
                    <AnimatePresence mode="wait">
                      {isLoading ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-2"
                        >
                          <motion.div
                            className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          />
                          Signing in...
                        </motion.div>
                      ) : (
                        <motion.span
                          key="text"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                        >
                          Sign In
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Button>
                </motion.div>
                <motion.p 
                  className="text-sm text-center text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  Don't have an account?{" "}
                  <Link 
                    to="/signup" 
                    className="text-primary hover:underline font-medium transition-colors hover:text-primary/80 relative inline-block group"
                  >
                    <span>Sign up</span>
                    <motion.span
                      className="absolute bottom-0 left-0 w-full h-0.5 bg-primary origin-left"
                      initial={{ scaleX: 0 }}
                      whileHover={{ scaleX: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  </Link>
                </motion.p>
              </CardFooter>
            </form>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
