import css from './header.css';
import React from 'react';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';

function Header() {
    return (
        <Stack direction="row" spacing={2}>
            <div className="header">
                <div>
                    <Button color='white' variant="outlined">Text</Button>
                    <Button color='white' variant="outlined">Text</Button>
                    <Button color='white' variant="outlined">Text</Button>
                    <Button color='white' variant="outlined">Text</Button>
                    <Button color='white' variant="outlined">Text</Button>
                    <Button color='white' variant="outlined">Text</Button>
                </div>
                <div>
                    <select id="languages">language
                        <option id='1' value="Finnish" placeholder='Finnish'></option>
                        <option id='2' value="Swedish" placeholder='Swedish'></option>
                        <option id='3' value="English " placeholder='English'></option>
                    </select>
                </div>
            </div>
        </Stack>
    )
}

export default Header;
