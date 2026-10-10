// import { useEffect, useState, useRef, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
import '../css/overview.css';
import '../css/admin.css';

export default function Overview() {

  return (
    <div className='overview-page-container'>

        <div className="filter-container">
            <button className='select-filter'>All</button>
            <button className='select-filter'>Week</button>
            <button className='select-filter'>Month</button>
            <button className='select-filter'>Year</button>
        </div>

        <div className="layout-card">
            <div className="card-item">
                <h3><b>Focus session</b></h3>
                <p>Card content goes here.</p>
            </div>
            <div className="card-item">
                <h3><b>Total Focus Time</b></h3>
                <p>Card content goes here.</p>
            </div>
            <div className="card-item">
                <h3><b>Animals Collected</b></h3>
                <p>Card content goes here.</p>
            </div>
        </div>

        <div className="layout-card">
            <div className="card-user">
                <div className='flowchart-user'>
                    <h3><b>Total Users</b></h3>
                    <p>Card content goes here.</p>
                </div>

                <div className='type-user'>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className='dot-color-verified'></div> 
                        <span>Users Verified</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className='dot-color-not-verified'></div>
                        <span>Users Not Verified</span>
                    </div>
                </div>
            </div>
            <div className="card-focus-chart">
                <h3><b>Focus Activity Chart</b></h3>
                <p>Card content goes here.</p>
            </div>
        </div>

        <div className="recent-registered-users">
            <h3><b>Recently Registered Users</b></h3>
            <table>
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Registration Date</th>
                        <th>Registration Time</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className='row'>
                        <td>Username</td>
                        <td>Email</td>
                        <td>Status</td>
                        <td>Registration Date</td>
                        <td>Registration Time</td>
                    </tr>
                    <tr className='row'>
                        <td>Username</td>
                        <td>Email</td>
                        <td>Status</td>
                        <td>Registration Date</td>
                        <td>Registration Time</td>
                    </tr>
                </tbody>
            </table>
        </div>

    </div>
  );
}