import "./StatsCards.css";

function StatsCards({ stats, variant = "default" }) {
  if (!stats || stats.length === 0) {
    return null;
  }

  return (
    <div className={`stats-cards ${variant}`}>
      {stats.map((stat, index) => (
        <div key={index} className="stat-card">
          {stat.icon && (
            <div className="stat-icon">
              {stat.icon}
            </div>
          )}
          <div className="stat-info">
            <span className="stat-number">
              {stat.value}
              {stat.suffix && <span className="stat-suffix">{stat.suffix}</span>}
            </span>
            <span className="stat-label">{stat.label}</span>
            {stat.description && (
              <span className="stat-description">{stat.description}</span>
            )}
          </div>
          {stat.trend && (
            <div className={`stat-trend ${stat.trend.direction}`}>
              {stat.trend.icon && stat.trend.icon}
              <span>{stat.trend.value}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default StatsCards;