// import { useEffect, useState, useRef, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo, faMagnifyingGlass, faBan } from '@fortawesome/free-solid-svg-icons';
import { faPenToSquare } from '@fortawesome/free-regular-svg-icons';
import '../css/usersmanage.css';
import '../css/admin.css';

export default function Usersmanage() {

  return (
    <div className='overview-page-container'>

        <div className="layout-card">
            <div className="card-item">
                <h3><b>Total Users</b></h3>
                <p>Card content goes here.</p>
                <p>Card content goes here.</p>
            </div>
            <div className="card-item">
                <h3><b>Active Users</b></h3>
                <p>Card content goes here.</p>
                <p>Card content goes here.</p>
            </div>
            <div className="card-item">
                <h3><b>isActive Users</b></h3>
                <p>Card content goes here.</p>
                <p>Card content goes here.</p>
            </div>
        </div>

        <div className='filter-container'>
            <form className="search-form">
                <input
                type="search"
                placeholder="Search by username or email"
                />
                <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="search-icon"
                />
            </form>

            <div className='group-filter'>
                <button className='dropdown-filter'>All role</button>
                <button className='dropdown-filter'>All status</button>
                <button className='dropdown-filter'>Fliter</button>
                <button className='dropdown-filter'>Sort</button>
            </div>
        </div>

        <div className="recent-registered-users">
            <table>
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Registration Date</th>
                        <th style={{textAlign: 'center'}}>action</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className='row'>
                        <td>Rank</td>
                        <td>Username</td>
                        <td>Email</td>
                        <td>Role</td>
                        <td>Status</td>
                        <td>Registration Date</td>
                        <td >
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                <FontAwesomeIcon icon={faCircleInfo} style={{color : '#5298daff'}}/>
                                <FontAwesomeIcon icon={faPenToSquare} style={{color : '#a3bd5bff'}}/> 
                                <FontAwesomeIcon icon={faBan} style={{color : '#da6652ff'}}/>
                            </div>
                        </td>
                    </tr>
                    <tr className='row'>
                        <td>Rank</td>
                        <td>Username</td>
                        <td>Email</td>
                        <td>Role</td>
                        <td>Status</td>
                        <td>Registration Date</td>
                        <td >
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                <FontAwesomeIcon icon={faCircleInfo} style={{color : '#5298daff'}}/>
                                <FontAwesomeIcon icon={faPenToSquare} style={{color : '#a3bd5bff'}}/> 
                                <FontAwesomeIcon icon={faBan} style={{color : '#da6652ff'}}/>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

    </div>
  );
}