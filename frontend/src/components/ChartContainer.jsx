import "./ChartContainer.css";

function ChartContainer({ 
  title, 
  description, 
  children, 
  className = "",
  actions = null,
  loading = false 
}) {
  return (
    <div className={`chart-container-wrapper ${className}`}>
      <div className="chart-card">
        <div className="chart-header">
          <div className="chart-title-section">
            <h3 className="chart-title">{title}</h3>
            {description && (
              <p className="chart-description">{description}</p>
            )}
          </div>
          {actions && (
            <div className="chart-actions">
              {actions}
            </div>
          )}
        </div>
        
        <div className="chart-content">
          {loading ? (
            <div className="chart-loading">
              <div className="chart-spinner"></div>
              <p>Loading chart data...</p>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}

export default ChartContainer;