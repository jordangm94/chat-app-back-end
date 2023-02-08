const { request, response } = require('express');
const express = require('express');
const router = express.Router();
const bcrypt = require("bcryptjs");
const { createToken, validateToken } = require("../JWT");

/////////////////////////////////
/// Index
/////////////////////////////////

module.exports = (db, actions) => {
  const { getContactByEmail, getContactByUsername, registerContact } = actions;

  router.get('/', (req, res) => {
    res.send('Hello from the CHAT APP!');
  });

  //This route is used to load the profile picture and last message received from each user in the chat list. This information also used in loading searched users (name and profile picture), which also uses the chatlistitem.
  router.get('/chat/list', (req, res) => {
    //Used DISTINCT ON to remove duplicate rows of conversation_id (i.e. multiple messages belonging to convo ID) and only show 1 message for each conversation ID in the ChatList component.
    db.query(
      `SELECT DISTINCT ON (conversation.id) conversation_id, conversation_name, member_1, member_2, message.id AS message_id, message_text, contact.id AS contact_id, contact.first_name, contact.last_name, contact.profile_photo_url, contact.email

      FROM conversation JOIN message ON conversation.id = conversation_id JOIN contact ON contact_id = contact.id
      
      WHERE member_1 = 1 OR member_2 = 1
      
      ORDER BY conversation.id DESC, message.id DESC;
      `
    ).then(({ rows }) => {
      res.json(rows);
    });
  });

  //This route is used for live searching for a user within the database using the search bar
  router.get('/searchuser', (req, res) => {
    const searchUserInput = `%${req.query.searchedUser}%`;
    console.log('Hello from searchUserInput', searchUserInput);
    db.query(
      `SELECT id, first_name, last_name, profile_photo_url
    
      FROM contact
     
      WHERE LOWER(first_name) LIKE
     
      LOWER($1);
      `, [searchUserInput]
    ).then(({ rows }) => {
      return res.json(rows);
    });
  });

  router.get('/chattest', (req, res) => {
    const searchUserInput = `%${req.query.searchedUser}%`;
    console.log('Hello from searchUserInput', searchUserInput);
    db.query(
      `SELECT id, first_name, last_name, profile_photo_url
    
      FROM contact
     
      WHERE LOWER(first_name) LIKE
     
      LOWER($1);
      `, [searchUserInput]
    ).then(({ rows }) => {
      return res.json(rows);
    });
  });

  //Need to add corresponding ID to the route, send in a request
  // router.get('/chat', (req, res) => {
  //   console.log(req);
  //   db.query(`SELECT * 
  //     FROM message 
  //     WHERE conversation_id = 1;
  //   `)
  //   .then(({ rows }) => {
  //     res.json(rows)
  //   })
  // });

  router.post('/register', (req, res) => {
    const { firstName, lastName, username, email, password } = req.body;

    getContactByEmail(db, email).then(contact => {
      if (contact) {
        return res.status(400).json({ error: "Email exists", message: "An account with this email already exists!" });
      }
      getContactByUsername(db, username).then(contact => {
        if (contact) {
          return res.status(400).json({ error: "Username exists", message: "This username has already been taken!" });
        } else {
          const hashedPassword = bcrypt.hashSync(password, 10);
          registerContact(db, firstName, lastName, username, email, hashedPassword).then(contact => {
            return res.json({ error: null, message: "Success", contact });
          })
            .catch(error => {
              return res.status(400).json({ error });
            });
        }
      });
    });
  });

  router.post('/login', (req, res) => {
    const { email, password } = req.body;

    getContactByEmail(db, email).then(contact => {
      if (contact && bcrypt.compareSync(password, contact.password_hash)) {
        const accessToken = createToken(contact);

        req.session.accessToken = accessToken;

        return res.json({ error: null, contact });
      } else {
        return res.status(400).json({ error: "Incorrect email or password!" });
      }
    });

  });

  router.post("/authenticate", (req, res) => {
    if (req.session.userEmail) {
      getUserByEmail(req.session.userEmail).then(user => {
        return res.json({ error: null, message: "Success", user });
      });
    } else {
      return res.json({ error: "Failed authentication", message: "You do not have a cookie session!" });
    }
  });

  router.get('/test', (req, res) => {
    res.json("test success");
  });

  return router;
};
