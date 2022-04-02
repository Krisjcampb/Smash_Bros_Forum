import './Navbar.css'

export default function Navbar() {
  return (
    <div class='container'>
      <h1 className='top smashtitle'>Smash Forum</h1>
      <form className='top loginform'>
        <label>
          Username:
          <input type='text' />
        </label>
        <label>
          Password:
          <input type='text' />
        </label>
      </form>
      <span className='linebreak'></span>
    </div>
  )
}
