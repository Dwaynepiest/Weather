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


router.put('/:id', apiKeyMiddleware, async (req, res) => { 
  const { id } = req.params;
  const { 
    email, 
    zip_code, 
    gender, 
    relation, 
    preference, 
    one_liner, 
    job, 
    education, 
    hobby, 
    about_you, 
    foto, 
    old_password, 
    new_password, 
    confirm_password 
  } = req.body;

  // Haal de bestaande gebruikergegevens op
  db.query('SELECT * FROM users WHERE user_id = ?', [id], async (err, results) => {
    if (err) {
      return res.status(500).send(err);
    }
    if (results.length === 0) {
      return res.status(404).send('Account niet gevonden.');
    }

    const user = results[0];

    // Controleer of het e-mailadres wordt bijgewerkt en of het al bestaat
    if (email && email !== user.email) {
      db.query('SELECT * FROM users WHERE email = ?', [email], (err, emailResults) => {
        if (err) {
          return res.status(500).send('Databasefout bij het controleren van e-mail.');
        }

        if (emailResults.length > 0) {
          return res.status(400).send('Een account met dit e-mailadres bestaat al.');
        }

        // Als het e-mailadres geldig is, ga door met bijwerken
        updateUserData();
      });
    } else {
      // Als het e-mailadres niet wordt bijgewerkt of het is geldig, ga door met bijwerken
      updateUserData();
    }

    // Functie om de gebruiker bij te werken
    async function updateUserData() {
      // Als het wachtwoord wordt bijgewerkt, controleren of het oude wachtwoord correct is en het nieuwe wachtwoord is bevestigd
      let updatedPassword = user.password;
      if (new_password) {
        if (old_password) {
          // Vergelijk het oude wachtwoord met het opgeslagen wachtwoord
          const isMatch = await bcrypt.compare(old_password, user.password);
          if (!isMatch) {
            return res.status(400).send('Het oude wachtwoord is incorrect.');
          }
        } else {
          return res.status(400).send('Je moet je oude wachtwoord invoeren.');
        }

        // Controleer of de nieuwe wachtwoorden overeenkomen
        if (new_password !== confirm_password) {
          return res.status(400).send('De nieuwe wachtwoorden komen niet overeen.');
        }

        // Valideer wachtwoordsterkte
        if (!validatePassword(new_password)) {
          return res.status(400).send('Wachtwoord voldoet niet aan de vereisten.');
        }

        // Hash het nieuwe wachtwoord
        updatedPassword = await bcrypt.hash(new_password, 10);
      }

      // Update alleen de velden die zijn meegegeven, behalve accept_service, birth_date, en nickname
      const updatedUser = {
        email: email || user.email,
        zip_code: zip_code || user.zip_code,
        gender: gender || user.gender,
        relation: relation || user.relation,
        preference: preference || user.preference,
        one_liner: one_liner || user.one_liner,
        job: job || user.job,
        education: education || user.education,
        hobby: hobby || user.hobby,
        about_you: about_you || user.about_you,
        foto: foto || user.foto,
        password: updatedPassword, // Zet het gehashte wachtwoord als het is bijgewerkt
        accept_service: user.accept_service, // Bewaar de oude waarde van accept_service
        birth_date: user.birth_date, // Bewaar de oude waarde van birth_date
        nickname: user.nickname // Bewaar de oude waarde van nickname
      };

      // Bijwerken van de gebruiker in de database
      db.query(
        'UPDATE users SET email = ?, zip_code = ?, gender = ?, relation = ?, preference = ?, one_liner = ?, job = ?, education = ?, hobby = ?, about_you = ?, foto = ?, password = ? WHERE user_id = ?',
        [
          updatedUser.email, 
          updatedUser.zip_code, 
          updatedUser.gender, 
          updatedUser.relation, 
          updatedUser.preference, 
          updatedUser.one_liner, 
          updatedUser.job, 
          updatedUser.education, 
          updatedUser.hobby, 
          updatedUser.about_you, 
          updatedUser.foto, 
          updatedUser.password, 
          id
        ],
        (err, updateResults) => {
          if (err) {
            return res.status(500).send(err);
          }

          res.json({
            message: 'Account succesvol bijgewerkt',
            id,
            ...updatedUser,
          });
        }
      );
    }
  });
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
