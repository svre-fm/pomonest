import { useEffect, useState, useRef, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo, faMagnifyingGlass, faBan, faAngleDown, faAngleRight, faUserTag } from '@fortawesome/free-solid-svg-icons';
import DetailUser from '../../component/Showdetailuser'
import '../../css/usersmanage.css';
import '../../css/admin.css';

export default function Usersmanage() {

    const [isopenroleDropdown, setIsopenroleDropdown] = useState(false);
    const [isopenstatusDropdown, setIsopenstatusDropdown] = useState(false);
    const [isopensortDropdown, setIsopensortDropdown] = useState(false);

    const [isopendetailuser, setIsopendetailuser] = useState(false);
    const [changeRole, setchangeRole] = useState(false);
    const [bandUser, setbandUser] = useState(false);

  return (
    <div className='overview-page-container'>

        <div className="filter-time">
            <button className='select-filter'>All</button>
            <button className='select-filter'>Week</button>
            <button className='select-filter'>Month</button>
            <button className='select-filter'>Year</button>
        </div>

        <div className="layout-card">
            <div className="card-item">
                <h3><b>Total Users</b></h3>
                <p>Card content goes here.</p>
                <p>เปรียบเทียบว่าเพิ่มขึ้นหรือลดลงจากเดือนที่แล้ว</p>
            </div>
            <div className="card-item">
                <h3><b>Active Users</b></h3>
                <p>โชว์จำนวน user ที่เข้ามาใช้</p>
                <p>เปรียบเทียบว่าเพิ่มขึ้นหรือลดลงจากเดือนที่แล้ว</p>
            </div>
            <div className="card-item">
                <h3><b>isActive Users</b></h3>
                <p>โชว์จำนวน user ที่ไม่เข้ามาใช้</p>
                <p>เปรียบเทียบว่าเพิ่มขึ้นหรือลดลงจากเดือนที่แล้ว</p>
            </div>
        </div>

        <div className="recent-registered-users">
            <div className='filter-container'>
                <form className="search-form">
                    <FontAwesomeIcon
                    icon={faMagnifyingGlass}
                    className="search-icon"
                    />
                    <input
                    type="search"
                    placeholder="Search by username or email"
                    />
                </form>

                <div className='group-filter'>
                    <div className="dropdown-wrapper">
                        <button
                        className={`dropdown-filter ${isopenroleDropdown ? 'active' : ''}`}
                        onClick={() => setIsopenroleDropdown(!isopenroleDropdown)}
                        >
                        role
                        <FontAwesomeIcon
                            icon={isopenroleDropdown ? faAngleRight : faAngleDown}
                            style={{ fontSize: '12px', margin: '7px 0px 0px 10px'}}
                        />
                        </button>

                        {isopenroleDropdown && (
                        <div className="dropdown">
                            <button className="dropdown-item">Admin</button>
                            <button className="dropdown-item">User</button>
                        </div>
                        )}
                    </div>

                    <div className="dropdown-wrapper">
                        <button
                        className={`dropdown-filter ${isopenstatusDropdown ? 'active' : ''}`}
                        onClick={() => setIsopenstatusDropdown(!isopenstatusDropdown)}
                        >
                        status
                        <FontAwesomeIcon
                            icon={isopenstatusDropdown ? faAngleRight : faAngleDown}
                            style={{ fontSize: '12px', margin: '7px 0px 0px 10px'}}
                        />
                        </button>

                        {isopenstatusDropdown && (
                        <div className="dropdown">
                            <button className="dropdown-item">Admin</button>
                            <button className="dropdown-item">User</button>
                        </div>
                        )}
                    </div>

                    <div className="dropdown-wrapper" style={{width: '30%'}}>
                        <button style={{width: '100%', textAlign: 'left',}}
                        className={`dropdown-filter ${isopensortDropdown ? 'active' : ''}`}
                        onClick={() => setIsopensortDropdown(!isopensortDropdown) }
                        >
                        sort
                        <FontAwesomeIcon
                            icon={isopensortDropdown ? faAngleRight : faAngleDown}
                            style={{ fontSize: '12px', margin: '7px 0px 0px 10px'}}
                        />
                        </button>

                        {isopensortDropdown && (
                        <div className="dropdown">
                            <button className="dropdown-item">Recent Registered</button>
                            <button className="dropdown-item">Lestest Registered</button>
                            <button className="dropdown-item">Mostest Focus time</button>
                            <button className="dropdown-item">Mostest Eggs Hatched</button>
                            <button className="dropdown-item">Mostest animal</button>
                        </div>
                        )}
                    </div>
                </div>
            </div>

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
                                <button className='icon faCircleInfo ' title='detail'><FontAwesomeIcon icon={faCircleInfo} onClick={() => setIsopendetailuser(true)}/></button>
                                <button className='icon faPenToSquare ' title='change role'><FontAwesomeIcon icon={faUserTag} /></button>
                                <button className='icon faBan ' title='band'><FontAwesomeIcon icon={faBan} /></button>
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
                                <FontAwesomeIcon icon={faUserTag} style={{color : '#a3bd5bff'}}/> 
                                <FontAwesomeIcon icon={faBan} style={{color : '#da6652ff'}}/>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        {isopendetailuser && (
            <DetailUser
                onClose={() => setIsopendetailuser(false)}
            />
        )}


    </div>
  );
}