import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './UserProfile.css';

function UserProfile() {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/profile`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        setProfileData(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load profile data');
        setLoading(false);
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        }
      }
    };

    fetchProfile();
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="loading">Loading your profile...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="profile-container">
      <header className="profile-header">
        <h1>My Profile</h1>
        <button onClick={logout} className="logout-btn">Logout</button>
      </header>

      <div className="profile-content">
        {/* Personal Information Card */}
        <div className="profile-card">
          <h2>👤 Personal Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Full Name:</label>
              <span>{profileData.user.name}</span>
            </div>
            <div className="info-item">
              <label>Email:</label>
              <span>{profileData.user.email}</span>
            </div>
            <div className="info-item">
              <label>Member Since:</label>
              <span>{formatDate(profileData.user.created_at)}</span>
            </div>
            <div className="info-item">
              <label>Account Type:</label>
              <span className="badge">Regular User</span>
            </div>
          </div>
        </div>

        {/* RFID & Wallet Information Card */}
        <div className="profile-card">
          <h2>💳 RFID Card & Wallet</h2>
          {profileData.user.tag_id ? (
            <div className="wallet-info">
              <div className="balance-display">
                <span className="balance-label">Current Balance</span>
                <span className="balance-amount">
                  ${parseFloat(profileData.user.balance || 0).toFixed(2)}
                </span>
              </div>
              <div className="info-grid">
                <div className="info-item">
                  <label>RFID Tag ID:</label>
                  <span className="tag-id">{profileData.user.tag_id}</span>
                </div>
                <div className="info-item">
                  <label>Card Status:</label>
                  <span className={`status ${profileData.user.status}`}>
                    {profileData.user.status?.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-rfid">
              <p>🚫 No RFID card assigned yet</p>
              <p>Contact admin to get your RFID card activated.</p>
            </div>
          )}
        </div>

        {/* Recent Activity Card */}
        <div className="profile-card">
          <h2>📋 Recent Activity</h2>
          {profileData.recentTransactions && profileData.recentTransactions.length > 0 ? (
            <div className="transactions-list">
              {profileData.recentTransactions.map((transaction, index) => (
                <div key={index} className="transaction-item">
                  <div className="transaction-info">
                    <span className={`transaction-type ${transaction.event}`}>
                      {transaction.event === 'entry' ? '🚪 Entry' : '🚶 Exit'}
                    </span>
                    <span className="station-name">{transaction.station_name}</span>
                  </div>
                  <div className="transaction-details">
                    <span className="transaction-time">
                      {formatDateTime(transaction.timestamp)}
                    </span>
                    <span className="scanner-type">
                      {transaction.scanner_type} scanner
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-transactions">
              <p>📝 No recent activity</p>
              <p>Start using your RFID card at train stations to see your travel history here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserProfile;
