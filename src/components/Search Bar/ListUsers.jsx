import React, { useState, useEffect } from 'react'



const ListUsers = () => {
    const [userList, setUserList] = useState([])
    const getUserList = async () => {
        try {
            const response = await fetch("http://localhost:5000/forumusers")
            const jsonData = await response.json()

            setUserList(jsonData);
        } catch (err) {
            console.error(err.message);
        }
    };

    useEffect(() => {
        getUserList();
    }, []);

    console.log(userList);

    return (
    <table className='table mt-32'>
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Region</th>
                        <th>Last Online</th>
                    </tr>
                </thead>
                <tbody>
                    {userList.map(e => (
                        <tr>
                            <td>{e.username}</td>
                            <td>View Account Details</td>
                            <td>Time Last Online</td>
                        </tr>
                    ))}                   
                </tbody>
            </table>
    )
}
export default ListUsers;