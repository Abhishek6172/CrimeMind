import React from 'react';
import dataCubeImg from '../../assets/data_cube.jpg';

export const NetworkCube3D: React.FC = () => {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '540px',
        height: '460px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img 
        src={dataCubeImg} 
        alt="Data Cube Visualization" 
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(255, 42, 66, 0.15)'
        }}
      />
    </div>
  );
};
