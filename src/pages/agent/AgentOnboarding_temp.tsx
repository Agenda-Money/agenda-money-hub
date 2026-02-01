// Temp file to test the fix
  // Selfie countdown timer
  const startSelfieCapture = () => {
    // Clear any existing interval
    if (selfieIntervalRef.current) {
      clearInterval(selfieIntervalRef.current);
    }
    
    let count = 3;
    setSelfieCountdown(count);
    
    selfieIntervalRef.current = setInterval(() => {
      count--;
      if (count <= 0) {
        if (selfieIntervalRef.current) {
          clearInterval(selfieIntervalRef.current);
          selfieIntervalRef.current = null;
        }
        setSelfieCountdown(null);
        // Directly trigger camera without setState callback
        selfieInputRef.current?.click();
      } else {
        setSelfieCountdown(count);
      }
    }, 1000);
  };
