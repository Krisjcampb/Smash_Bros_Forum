import React from 'react'
import { Dropdown } from 'react-bootstrap'
const FriendOptionsDropdown = ({
  onRemoveFriend,
  onDirectMessage,
  onBlockFriend,
}) => {
  return (
    <Dropdown>
      <Dropdown.Toggle variant='success' id='dropdown-basic'>
        Friend
      </Dropdown.Toggle>

      <Dropdown.Menu>
        <Dropdown.Item onClick={onRemoveFriend}>Remove Friend</Dropdown.Item>
        <Dropdown.Item onClick={onDirectMessage}>Direct Message</Dropdown.Item>
        <Dropdown.Item onClick={onBlockFriend}>Block Friend</Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  )
}

export default FriendOptionsDropdown
