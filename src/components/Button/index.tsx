import styled from 'styled-components';

const Button = styled.button`
  background-color: white;
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  appearance: none;
  font-size: 1.3rem;
  box-shadow: 0px 8px 28px -6px rgba(24, 39, 75, 0.12),
    0px 18px 88px -4px rgba(24, 39, 75, 0.14);
  transition: transform ease-in 0.1s;
  cursor: pointer;

  &:hover {
    transform: scale(1.05);
  }
`;

export default Button;
