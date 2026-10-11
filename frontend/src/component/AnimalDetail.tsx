import { useEffect, useRef, useState } from 'react';
import { faXmark, faImage } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import '../css/eggdetail.css';
import '../css/admin.css';

interface Animalprop {
  onClose: () => void;
}

export default function AnimalDetail({ onClose }: Animalprop) {
  const [name, setName] = useState('');
  const [rarity, setRarity] = useState('');

  const [image1, setImage1] = useState<File | null>(null);
  const [image2, setImage2] = useState<File | null>(null);

  const [preview1, setPreview1] = useState<string | null>(null);
  const [preview2, setPreview2] = useState<string | null>(null);

  const input1Ref = useRef<HTMLInputElement>(null);
  const input2Ref = useRef<HTMLInputElement>(null);

  // Release preview URLs when they change or the component unmounts
  useEffect(() => {
    return () => {
      if (preview1) URL.revokeObjectURL(preview1);
    };
  }, [preview1]);

  useEffect(() => {
    return () => {
      if (preview2) URL.revokeObjectURL(preview2);
    };
  }, [preview2]);

  // Select the first image
  const handleImage1Change = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (file) {
      setImage1(file);
      setPreview1(URL.createObjectURL(file));
    }
  };

  // Select the second image
  const handleImage2Change = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (file) {
      setImage2(file);
      setPreview2(URL.createObjectURL(file));
    }
  };

  // Clear all fields without closing the window
  const handleCancel = () => {
    setName('');
    setRarity('');
    setImage1(null);
    setImage2(null);
    setPreview1(null);
    setPreview2(null);

    if (input1Ref.current) input1Ref.current.value = '';
    if (input2Ref.current) input2Ref.current.value = '';
  };

  // Submit form
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!image1 || !image2) {
      alert('Please select both images.');
      return;
    }

    console.log('Animal name:', name);
    console.log('Animal rarity:', rarity);
    console.log('Image 1:', image1);
    console.log('Image 2:', image2);

    alert('Form is ready to submit!');
  };

  return (
    <div className="bg">
      <div className="detail-contiener animal-detail">
        <button
          type="button"
          className="close"
          onClick={onClose}
          aria-label="Close"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>

        <form onSubmit={handleSubmit}>
          {/* Row 1: Name and Rarity */}
          <div className="animal-info-row">
            <div className="egg-form-group">
              <label htmlFor="animal-name">Name</label>
              <input
                id="animal-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter animal name"
                required
              />
            </div>

            <div className="egg-form-group">
              <label htmlFor="animal-rarity">Rarity</label>
              <input
                id="animal-rarity"
                type="text"
                value={rarity}
                onChange={(event) => setRarity(event.target.value)}
                placeholder="Enter rarity"
                required
              />
            </div>
          </div>

          {/* Row 2: Two clickable image previews */}
          <div className="animal-images-row">
            <div className="animal-image-field">
              <label>Image animal</label>

              <input
                ref={input1Ref}
                id="animal-image-1"
                className="animal-file-input"
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleImage1Change}
              />

              <label
                htmlFor="animal-image-1"
                className="animal-image-clickable"
                title="Click to select or change image"
              >
                {preview1 ? (
                  <img src={preview1} alt="Animal image 1 preview" />
                ) : (
                  <div className="animal-image-placeholder">
                    <FontAwesomeIcon icon={faImage} />
                    <span>Choose image</span>
                  </div>
                )}
              </label>

              <p className="animal-image-name">
                {image1?.name || 'No image selected'}
              </p>
            </div>

            <div className="animal-image-field">
              <label>Animaltion animal</label>

              <input
                ref={input2Ref}
                id="animal-image-2"
                className="animal-file-input"
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleImage2Change}
              />

              <label
                htmlFor="animal-image-2"
                className="animal-image-clickable"
                title="Click to select or change image"
              >
                {preview2 ? (
                  <img src={preview2} alt="Animal image 2 preview" />
                ) : (
                  <div className="animal-image-placeholder">
                    <FontAwesomeIcon icon={faImage} />
                    <span>Choose image</span>
                  </div>
                )}
              </label>

              <p className="animal-image-name">
                {image2?.name || 'No image selected'}
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