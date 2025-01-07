const express = require('express')
const router = express.Router()
const argon2 = require('argon2')
const jwt = require('jsonwebtoken')
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { poolPromise } = require('../db');


router.get('/users', async (req, res) => {
	try {
		const pool = await poolPromise; // Lấy connection pool
		const result = await pool.request().query('SELECT * FROM Users'); // Truy vấn SQL
		res.json(result.recordset); // Trả kết quả dưới dạng JSON
	} catch (err) {
		console.error('Query error:', err);
		res.status(500).send('Error querying the database.');
	}
});

router.get('/', verifyToken, async (req, res) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('id', req.id)
			.query('SELECT id, username FROM Users WHERE id = @id');

		const user = result.recordset[0];
		if (!user)
			return res.status(400).json({ success: false, message: 'User not found' });

		res.json({ success: true, user });
	} catch (error) {
		console.error(error);
		res.status(500).json({ success: false, message: 'Internal server error' });
	}
});

// @route POST api/auth/register
// @desc Register user
// @access Public
router.post('/register', async (req, res) => {
	const { username, password } = req.body;

	// Simple validation
	if (!username || !password)
		return res.status(400).json({ success: false, message: 'Missing username and/or password' });

	try {
		const pool = await poolPromise;

		// Check for existing user
		const existingUser = await pool.request()
			.input('Username', username)
			.query('SELECT * FROM Users WHERE username = @Username');

		if (existingUser.recordset.length > 0)
			return res.status(400).json({ success: false, message: 'Username already taken' });

		// All good
		const hashedPassword = await argon2.hash(password);
		await pool.request()
			.input('Username', username)
			.input('Password', hashedPassword)
			.query('INSERT INTO Users (username, password) VALUES (@username, @password)');

		// Return token
		const result = await pool.request()
			.input('Username', username)
			.query('SELECT id FROM Users WHERE username = @Username');

		const newUser = result.recordset[0];
		const accessToken = jwt.sign(
			{ userId: newUser.id },
			process.env.ACCESS_TOKEN_SECRET
		);

		res.json({
			success: true,
			message: 'User created successfully',
			accessToken
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ success: false, message: 'Internal server error' });
	}
});

// @route POST api/auth/login
// @desc Login user
// @access Public
router.post('/login', async (req, res) => {
	const { username, password, uuid } = req.body;

	// Simple validation
	if (!username || !password)
		return res.status(400).json({ success: false, message: 'Missing username and/or password' });

	try {
		const pool = await poolPromise;

		// Check for existing user
		const result = await pool.request()
			.input('Username', username)
			.query('SELECT * FROM Users WHERE username = @Username');

		const user = result.recordset[0];
		if (!user)
			return res.status(400).json({ success: false, message: 'Incorrect username or password' });

		// Username found
		const passwordValid = await argon2.verify(user.password, password);
		if (!passwordValid)
			return res.status(400).json({ success: false, message: 'Incorrect username or password' });

		// Check UUID logic
		console.log(uuid)
		if (!user.uuid) {
			// If user.uuid is null, update with the new uuid
			await pool.request()
				.input('UUID', uuid)
				.input('Username', username)
				.query('UPDATE Users SET uuid = @UUID WHERE username = @Username');

			// Proceed to login
		} else if (user.uuid !== uuid) {
			// If user.uuid exists and doesn't match the provided uuid, deny login
			return res.status(403).json({ success: false, message: 'This account is locked to another device.' });
		}

		// Create JWT token with user role included
		const accessToken = jwt.sign(
			{ userId: user.id, role: user.role }, // Add role to JWT payload
			process.env.ACCESS_TOKEN_SECRET,
			{ expiresIn: '1h' } // Optional: Set token expiration time
		);

		res.json({
			success: true,
			message: 'User logged in successfully',
			accessToken,
			role: user.role // Return the user's role as part of the response
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ success: false, message: 'Internal server error' });
	}
});

module.exports = router
