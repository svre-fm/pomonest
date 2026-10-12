
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlass,
  faAngleDown,
  faAngleRight,
} from '@fortawesome/free-solid-svg-icons';
import { faPenToSquare, faTrashCan} from '@fortawesome/free-regular-svg-icons';

import EggDetail from '../../component/EggDetail';
import AnimalDetail from '../../component/AnimalDetail';


import '../../css/data.css';
import '../../css/admin.css';


type Page = 'egg' | 'animal';

export default function Usersmanage() {
  const [page, setPage] = useState<Page>('egg');
  const [isopenroleDropdown, setIsopenroleDropdown] = useState(false);
  const [isedit, setIsedit] = useState(false);

  return (
    <div className="overview-page-container">

      {/* Switch between Eggs and Animals */}
      <div className="filter-page">
        <button
          className={`select-filter ${page === 'egg' ? 'active' : ''}`}
          onClick={() => {
            setPage('egg');
            setIsopenroleDropdown(false);
          }}
        >
          Eggs
        </button>

        <button
          className={`select-filter ${page === 'animal' ? 'active' : ''}`}
          onClick={() => {
            setPage('animal');
            setIsopenroleDropdown(false);
          }}
        >
          Animals
        </button>
      </div>

      {/* Search and filters */}
      <div className="filter-container-data">
        <form
          className="search-form-data"
          onSubmit={(e) => e.preventDefault()}
        >
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="search-icon-data"
          />
          <input
            type="search"
            placeholder={`Search ${page === 'egg' ? 'eggs' : 'animals'}`}
          />
        </form>

        {page === 'animal' && (
            <div className='group-filter-data'>
                <div className="dropdown-wrapper">
                    <button
                    className={`dropdown-filter ${
                        isopenroleDropdown ? 'active' : ''
                    }`}
                    onClick={() =>
                        setIsopenroleDropdown(!isopenroleDropdown)
                    }
                    >
                    Filter
                    <FontAwesomeIcon
                        icon={
                        isopenroleDropdown ? faAngleRight : faAngleDown
                        }
                        style={{ fontSize: '12px', marginLeft: '10px', marginTop: '6px' }}
                    />
                    </button>

                    {isopenroleDropdown && (
                    <div className="dropdown">
                        <button className="dropdown-item">rarity</button>
                    </div>
                    )}
                </div>
          </div>
        )}
        <button className='add' onClick={() => setIsedit(true)}>add</button>
      </div>
      

      {/* Table */}
        <div className="recent-registered-users">
            <table>
                {page === 'egg' ? (
                <>
                    <thead>
                    <tr>
                        <th>ID</th>
                        <th>Egg Name</th>
                        <th>Hatch Time</th>
                        <th>rewards</th>
                        <th style={{textAlign: 'center'}}>Action</th>
                    </tr>
                    </thead>

                    <tbody>
                    <tr className="row">
                        <td>1</td>
                        <td>Common Egg</td>
                        <td>60 minutes</td>
                        <td>Active</td>
                        <td >
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                <button className='icon faPenToSquare '><FontAwesomeIcon icon={faPenToSquare} onClick={() => setIsedit(true)}/></button>
                                <button className='icon faBan ' ><FontAwesomeIcon icon={faTrashCan} /></button>
                            </div>
                        </td>
                    </tr>
                    </tbody>
                </>
                ) : (
                <>
                    <thead>
                    <tr>
                        <th>ID</th>
                        <th>Animal Name</th>
                        <th>Rarity</th>
                        <th style={{textAlign: 'center'}}>Action</th>
                    </tr>
                    </thead>

                    <tbody>
                    <tr className="row">
                        <td>1</td>
                        <td>Cat</td>
                        <td>command</td>
                        <td >
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                <button className='icon faPenToSquare '><FontAwesomeIcon icon={faPenToSquare} onClick={() => setIsedit(true)}/></button>
                                <button className='icon faBan ' ><FontAwesomeIcon icon={faTrashCan} /></button>
                            </div>
                        </td>
                    </tr>
                    </tbody>
                </>
                )}
            </table>
        </div>

        {isedit && (
            page === 'egg' ? (
                <EggDetail
                    onClose={() => setIsedit(false)}
                />
            ) : (
                <AnimalDetail
                    onClose={() => setIsedit(false)}
                />
            )
        )}

    </div>
  );
}
