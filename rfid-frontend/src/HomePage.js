import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

function HomePage() {
  return (
    <div className="homepage">
      <header className="hero-section">
        <h1>RFID Train Access System</h1>
        <p className="hero-subtitle">Revolutionary contactless train station access using RFID technology</p>
        <div className="hero-buttons">
          <Link to="/signup" className="btn btn-primary">Get Started</Link>
          <Link to="/login" className="btn btn-secondary">Login</Link>
        </div>
      </header>

      <section className="features">
        <h2>How It Works</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <h3>🏷️ RFID Tags</h3>
            <p>Each passenger gets a unique RFID tag for seamless entry and exit</p>
          </div>
          <div className="feature-card">
            <h3>📡 Smart Scanners</h3>
            <p>Advanced scanners at station entry/exit points for instant detection</p>
          </div>
          <div className="feature-card">
            <h3>⚡ Real-time Tracking</h3>
            <p>Live monitoring of passenger flow and station occupancy</p>
          </div>
          <div className="feature-card">
            <h3>💳 Digital Balance</h3>
            <p>Integrated payment system with automatic fare deduction</p>
          </div>
        </div>
      </section>

      <section className="benefits">
        <h2>Benefits</h2>
        <ul>
          <li>✅ Faster station entry/exit - no queues</li>
          <li>✅ Contactless and hygienic travel</li>
          <li>✅ Reduced operational costs</li>
          <li>✅ Better crowd management</li>
          <li>✅ Enhanced security and tracking</li>
        </ul>
      </section>

      <section className="cta">
        <h2>Ready to Experience the Future of Train Travel?</h2>
        <Link to="/signup" className="btn btn-large">Register Now</Link>
      </section>
    </div>
  );
}

export default HomePage;
