import styled from 'styled-components';
import React from 'react';

const ModalBackground = styled.div`
  background-color: rgba(20, 20, 20, 0.85);
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 100000000;
  display: flex;
  justify-content: center;
  align-items: center;
`;

function Modal({
  children,
  visible,
  setVisible,
}: {
  children: React.ReactNode;
  visible: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <ModalBackground
      style={{ display: visible ? 'flex' : 'none' }}
      onMouseDown={() => {
        setVisible(false);
      }}
    >
      {children}
    </ModalBackground>
  );
}

const ConfirmDialogBackground = styled.div`
  background-color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
  border-radius: 20px;
`;
const ConfirmDialogTitle = styled.div`
  font-size: 3rem;
`;
const ConfirmDialogButtons = styled.div`
  display: flex;
`;
const ConfirmDialogYesButton = styled.div`
  background-color: #d40000;
  font-size: 2rem;
  padding: 0 20px 0 20px;
  margin: 5px;
  border-radius: 20px;

  :hover {
    filter: brightness(0.8);
  }
`;
const ConfirmDialogCancelButton = styled.div`
  border: 2px solid black;
  background-color: white;
  font-size: 2rem;
  padding: 0 20px 0 20px;
  margin: 5px;
  border-radius: 20px;

  :hover {
    filter: brightness(0.8);
  }
`;

function ConfirmDialog({
  title,
  confirm,
  setVisible,
}: {
  title: string;
  confirm: () => void;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <ConfirmDialogBackground
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
    >
      <ConfirmDialogTitle>{title}</ConfirmDialogTitle>
      <ConfirmDialogButtons>
        <ConfirmDialogYesButton
          onClick={() => {
            setVisible(false);
            confirm();
          }}
        >
          Yes
        </ConfirmDialogYesButton>
        <ConfirmDialogCancelButton
          onClick={() => {
            setVisible(false);
          }}
        >
          Cancel
        </ConfirmDialogCancelButton>
      </ConfirmDialogButtons>
    </ConfirmDialogBackground>
  );
}

const ConfirmModal = ({
  title,
  confirm,
  visible,
  setVisible,
}: {
  title: string;
  confirm: () => void;
  visible: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  return (
    <Modal visible={visible} setVisible={setVisible}>
      <ConfirmDialog title={title} confirm={confirm} setVisible={setVisible} />
    </Modal>
  );
};

export default ConfirmModal;
