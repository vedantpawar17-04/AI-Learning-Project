import "./LoadingState.css";

function LoadingState({ 
  message = "Loading...", 
  size = "medium",
  fullScreen = false 
}) {
  const containerClass = fullScreen 
    ? "loading-state-container fullscreen" 
    : "loading-state-container";

  return (
    <div className={containerClass}>
      <div className="loading-state">
        <div className={`spinner ${size}`}></div>
        <p className="loading-message">{message}</p>
      </div>
    </div>
  );
}

export default LoadingState;