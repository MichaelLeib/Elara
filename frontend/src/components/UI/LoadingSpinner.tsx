/** @jsxImportSource @emotion/react */
import { css, keyframes } from '@emotion/react';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const spinnerStyle = css`
  display: inline-block;
  width: 3rem;
  height: 3rem;
  border: 0.4rem solid #e0e0e0;
  border-top: 0.4rem solid #006EE6;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
  margin: 2rem auto;
`;

export const LoadingSpinner = () => (
  <div css={spinnerStyle} aria-label="Loading..."></div>
); 