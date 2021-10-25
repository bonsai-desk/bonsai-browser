import React, { useEffect } from 'react';

// eslint-disable-next-line import/prefer-default-export
export const useMiddleClick = (
  divRef: React.RefObject<HTMLDivElement>,
  handleAuxClick: (e: MouseEvent) => void
) => {
  useEffect(() => {
    if (divRef && divRef.current) {
      divRef.current.addEventListener('auxclick', handleAuxClick);
      const cap = divRef.current;
      return () => {
        cap?.removeEventListener('auxclick', handleAuxClick);
      };
    }
    return () => {};
  });
};
