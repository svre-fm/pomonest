import { useEffect, useRef, useState } from 'react';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import '../css/eggdetail.css';
import '../css/admin.css';

interface Eggprop {
  onClose: () => void;
}

export default function EggDetail({ onClose }: Eggprop) {
  const [name, setName] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear the form without closing the window
  const handleCancel = () => {
    setName('');
    setImagePreview(null);
    setImageFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle image selection and preview
  const handleImageChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Release the previous preview URL to avoid memory leaks
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Handle form submission
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      alert('Please enter an egg name.');
      return;
    }

    if (!imageFile) {
      alert('Please select an image.');
      return;
    }

    // TODO: Send name and imageFile to the backend API
    console.log('Egg name:', name);
    console.log('Egg image:', imageFile);

    alert('Form is ready to submit!');
  };

  return (
    <div className="bg">
      <div className="detail-contiener">
        <button
          type="button"
          className="close"
          onClick={onClose}
          aria-label="Close"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>

        <form onSubmit={handleSubmit}>
          <div className="egg-form-group">
            <label htmlFor="egg-name">Name</label>
            <input
              id="egg-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter egg name"
              required
            />
          </div>

          <div className="egg-form-group">
            <label htmlFor="egg-image">Image</label>
            <input
              ref={fileInputRef}
              id="egg-image"
              type="file"
              accept="image/png, image/jpeg"
              onChange={handleImageChange}
              required
            />
          </div>

          {imagePreview && (
            <div className="egg-image-preview">
              <p>Image Preview</p>
              <img src={imagePreview} alt="Egg preview" />
            </div>
          )}

          <div className="egg-form-actions">
            <button
              type="button"
              className="cancel-btn-egg"
              onClick={handleCancel}
            >
              Cancel
            </button>

            <button type="submit" className="submit-btn-egg">
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}