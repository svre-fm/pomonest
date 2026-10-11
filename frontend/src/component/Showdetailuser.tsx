import { faXmark } from '@fortawesome/free-solid-svg-icons';
import '../css/detailuser.css'
import '../css/admin.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface DetailUserprop {
  onClose: () => void
}
export default function DetailUser({onClose} :DetailUserprop) {
  

    return (
        <div className="bg">
            <div className='detail-contiener'>
                <button className='close' onClick={onClose}>
                    <FontAwesomeIcon icon={faXmark}/>
                </button>
                Username

                <div className="layout-card">
                    <div className="card-item" style={{boxShadow: 'none'}}>
                        <h3><b>Focus Session</b></h3>
                        <p>Card content goes here.</p>
                    </div>
                    <div className="card-item" style={{boxShadow: 'none'}}>
                        <h3><b>Total Focus Time</b></h3>
                        <p>Card content goes here.</p>
                    </div>
                </div>
                <div className="layout-card">
                    <div className="card-item" style={{boxShadow: 'none'}}>
                        <h3><b>Animals Collected</b></h3>
                        <p>Card content goes here.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}