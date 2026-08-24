// Third-party Imports
import styled from '@emotion/styled'

const StyledHorizontalNav = styled.div`
  inline-size: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-behavior: smooth;
  white-space: nowrap;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
  position: relative;
  ${({ customStyles }) => customStyles}
`

export default StyledHorizontalNav
