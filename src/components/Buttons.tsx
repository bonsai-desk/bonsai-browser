import styled from 'styled-components';
import { color } from '../utils/jsutils';

export const Buttons = styled.button`
  cursor: pointer;
  padding: 0.375rem 0.625rem;
  margin: 0;
  font-family: inherit;
  font-size: inherit;
  border-radius: 0.25rem;
  font-weight: 500;
  border: none;
  display: inline-flex;
  align-items: center;
  color: ${color('body-text-color')};
  background-color: transparent;
  transition-property: filter, background, color, opacity;
  transition-duration: 0.075s;
  transition-timing-function: ease;

  :hover {
    background-color: ${color('body-text-color', 'opacity-lower')};
  }

  :active,
  :hover:active,
  &.is-active {
    color: ${color('body-text-color')};
    background-color: ${color('body-text-color', 'opacity-lower')};
  }

  :active,
  :hover:active,
  :active.is-active {
    background-color: ${color('body-text-color', 'opacity-low')};
  }

  :disabled,
  :disabled:active {
    color: ${color('body-text-color', 'opacity-low')};
    background-color: ${color('body-text-color', 'opacity-lower')};
    cursor: default;
  }

  svg {
    margin-block-start: -0.0835em;
    margin-block-end: -0.0835em;

    &:not(:last-child) {
      margin-inline-end: 0.251em;
    }

    &:not(:first-child) {
      margin-inline-start: 0.251em;
    }

    &:first-child:last-child {
      margin-inline-start: -0.25rem;
      margin-inline-end: -0.25rem;
    }
  }

  span {
    flex: 1 0 auto;
    text-align: left;
  }

  kbd {
    margin-inline-start: 1rem;
    font-size: 85%;
  }

  &.is-primary {
    color: ${color('link-color')};
    background-color: ${color('link-color', 'opacity-lower')};

    :hover {
      background-color: ${color('link-color', 'opacity-low')};
    }

    :active,
    :hover:active,
    &.is-active {
      color: white;
      background-color: ${color('link-color')};
    }

    :disabled,
    :disabled:active {
      color: ${color('body-text-color', 'opacity-low')};
      background-color: ${color('body-text-color', 'opacity-lower')};
      cursor: default;
    }
  }

  &.is-lowkey {
    :disabled,
    :disabled:active {
      color: ${color('body-text-color', 'opacity-low')};
      background-color: transparent;
      cursor: default;
    }
  }

  &.is-error {
    color: ${color('error-color')};
    background-color: ${color('error-color', 'opacity-lower')};

    :hover {
      background-color: ${color('error-color', 'opacity-low')};
    }

    :active,
    :hover:active,
    &.is-active {
      color: white;
      background-color: ${color('error-color')};
    }

    :disabled,
    :disabled:active {
      color: ${color('body-text-color', 'opacity-low')};
      background-color: ${color('body-text-color', 'opacity-lower')};
      cursor: default;
    }
  }
`;

export const ToggleButton = styled(Buttons)`
  border-radius: 1000px;
  padding: 0.375rem 0.5rem;
  color: ${color('body-text-color', 'opacity-high')};
`;

export const ButtonRow = styled.div`
  display: grid;
  grid-auto-flow: column;
  grid-gap: 0.25rem;
  justify-content: flex-start;
  svg {
    font-size: 20px;
  }
  button {
    justify-self: flex-start;
  }
`;
