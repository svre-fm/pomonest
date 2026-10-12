import { useEffect, useRef, useState } from 'react';
import { faXmark, faImage } from '@fortawesome/free-solid-svg-icons';
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

  // Release the previous preview URL
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Select an image
  const handleImageChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Clear the form without closing the window
  const handleCancel = () => {
    setName('');
    setImagePreview(null);
    setImageFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit form
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
      <div className="detailegg-contiener">
        <button
          type="button"
          className="close"
          onClick={onClose}
          aria-label="Close"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>

        <form onSubmit={handleSubmit}>
          {/* Row 1: Egg name */}
          <div className="egg-form-group egg-name-row">
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

          {/* Row 2: Clickable image */}
          <div className="egg-images-row">
            <div className="egg-image-field">
              <label htmlFor="egg-image">Image</label>

              <input
                ref={fileInputRef}
                id="egg-image"
                className="egg-file-input"
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleImageChange}
              />

              <label
                htmlFor="egg-image"
                className="egg-image-clickable"
                title="Click to select or change image"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Egg preview" />
                ) : (
                  <div className="egg-image-placeholder">
                    <FontAwesomeIcon icon={faImage} />
                    <span>Choose image</span>
                  </div>
                )}
              </label>

              <p className="egg-image-name">
                {imageFile?.name || 'No image selected'}
              </p>
            </div>
          </div>

          {/* Actions */}
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