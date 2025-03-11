const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('../db');
const apiKeyMiddleware = require('../middlewares/apiKeyMiddleware');
const validatePassword = require('../utils/validatePassword');

router.get('/', apiKeyMiddleware, (req, res) => {
  db.query('SELECT * FROM users', (err, results) => {
      if (err) return res.status(500).send(err);
      res.json(results);
  });
});

router.post('/', apiKeyMiddleware, async (req, res) => {
  const {
    first_name,
    surname,
    email,
    password,
    birthdate,
    role,
    created_on
  } = req.body;

  console.log('Request body:', req.body);

  // Validate password strength
  if (!validatePassword(password)) {
    return res.status(400).send('Password does not meet the requirements. Minimum 16 characters, including uppercase, lowercase, number, and special character.');
  }

  try {
    // Check if the email already exists
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) {
        return res.status(500).send('Database error while checking email.');
      }

      if (results.length > 0) {
        return res.status(400).send('A user with this email address already exists.');
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert the new user
      db.query(
        'INSERT INTO users (first_name, surname, email, password, birthdate, role, created_on) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          first_name,
          surname,
          email,
          hashedPassword,
          birthdate,
          role,
          created_on
        ],
        (err, results) => {
          if (err) {
            return res.status(500).send(err);
          }

          res.json({
            message: 'Account successfully registered.',
            id: results.insertId,
            first_name,
            surname,
            email,
          });
        }
      );
    });
  } catch (err) {
    console.error('Error hashing password: ', err);
    res.status(500).send('An error occurred during registration.');
  }
});



router.post('/login', apiKeyMiddleware, async (req, res) => {
  const { email, password } = req.body;

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) return res.status(500).send('An error occurred.');
      
      if (results.length === 0) return res.status(400).send('Account not found.');

      const user = results[0];

      try {
          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) return res.status(400).send('Incorrect password.');

          delete user.password; // Remove the password from the response
          res.json(user);
      } catch (compareError) {
          return res.status(500).send('An error occurred while comparing passwords.');
      }
  });
});


router.put('/:user_id', apiKeyMiddleware, async (req, res) => {
  const { user_id } = req.params;
  const {
    first_name,
    surname,
    email,
    old_password,
    new_password,
    confirm_new_password,
    birthdate,
  } = req.body;

  // Voeg hier je logica toe om de gebruiker bij te werken met de user_id
  // Bijvoorbeeld:
  // const user = await User.findById(user_id);
  // if (!user) return res.status(404).send('User not found.');
  // user.first_name = first_name;
  // user.surname = surname;
  // user.email = email;
  // etc.

  res.send('User updated successfully');
});



router.delete('/:user_id', apiKeyMiddleware, async (req, res) => {
  const { user_id } = req.params; // Haal user_id uit de URL-parameter

  if (!user_id) {
    return res.status(400).send('User ID is vereist om een gebruiker te verwijderen.');
  }

  try {
    // Controleer of de gebruiker bestaat
    db.query('SELECT * FROM users WHERE user_id = ?', [user_id], (err, results) => {
      if (err) {
        return res.status(500).send('Databasefout bij het zoeken naar gebruiker.');
      }

      if (results.length === 0) {
        return res.status(404).send('Geen account gevonden');
      }

      // Begin met het verwijderen van gekoppelde records
      db.query('DELETE FROM relationship WHERE user_id = ?', [user_id], (err) => {
        if (err) console.error('Fout bij het verwijderen uit relationship:', err);
      });

      db.query('DELETE FROM extra WHERE user_id = ?', [user_id], (err) => {
        if (err) console.error('Fout bij het verwijderen uit extra:', err);
      });

      db.query('DELETE FROM gallery WHERE user_id = ?', [user_id], (err) => {
        if (err) console.error('Fout bij het verwijderen uit gallery:', err);
      });

      db.query('DELETE FROM matches WHERE user1_id = ? OR user2_id = ?', [user_id, user_id], (err) => {
        if (err) console.error('Fout bij het verwijderen uit matches:', err);
      });

      db.query('DELETE FROM likes WHERE liker_id = ? OR liked_id = ?', [user_id, user_id], (err) => {
        if (err) console.error('Fout bij het verwijderen uit likes:', err);
      });

      // Verwijder de gebruiker zelf
      db.query('DELETE FROM users WHERE user_id = ?', [user_id], (err) => {
        if (err) {
          return res.status(500).send('Fout bij het verwijderen van je account, contacteer een beheerder!');
        }

        // Stuur een succesbericht terug
        res.json({
          message: 'Account en gekoppelde gegevens succesvol verwijderd.',
          user_id,
        });
      });
    });
  } catch (err) {
    console.error('Error during user deletion:', err);
    res.status(501).send('Er is een fout opgetreden tijdens het verwijderen van je account, contacteer een beheerder!');
  }
});

module.exports = router;
