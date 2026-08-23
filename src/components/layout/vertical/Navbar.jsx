// Component Imports
import LayoutNavbar from '@layouts/components/vertical/Navbar'
import NavbarContent from './NavbarContent'

const Navbar = ({ dictionary }) => {
  return (
    <LayoutNavbar>
      <NavbarContent dictionary={dictionary} />
    </LayoutNavbar>
  )
}

export default Navbar
