// // src/components/TherapistQRCode.tsx
// import { FC } from 'react';
// import { QRCodeSVG } from 'qrcode.react';

// interface TherapistQRCodeProps {
//   value: string;
// }

// const TherapistQRCode: FC<TherapistQRCodeProps> = ({ value }) => {
//   return (
//     <div style={{ display: 'flex', justifyContent: 'center', margin: '1.5rem 0' }}>
//       <QRCodeSVG value={value} size={180} level="H" includeMargin={true} />
//     </div>
//   );
// };

// export default TherapistQRCode;
// src/components/TherapistQRCode.tsx
import { type FC } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface TherapistQRCodeProps {
  value: string;
}

const TherapistQRCode: FC<TherapistQRCodeProps> = ({ value }) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '1.5rem 0' }}>
      <QRCodeSVG value={value} size={180} level="H" includeMargin={true} />
    </div>
  );
};

export default TherapistQRCode;
