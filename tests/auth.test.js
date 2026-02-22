const request = require('supertest');
const app = require('../app');
const { sequelize, connectDB } = require('../src/config/database');
const User = require('../src/models/User');
const Session = require('../src/models/Session');

beforeAll(async () => {
    await connectDB();
});

afterAll(async () => {
    await sequelize.close();
});

describe('Authentication Flow', () => {
    let userToken;
    const testUser = {
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        fullName: 'Test User'
    };

    test('Should register a new user (via admin)', async () => {
        // In this system, register is restricted to Admin. 
        // For simplicity, we'll create the user directly in DB or test login with seeded admin.
        const user = await User.create({
            ...testUser,
            password: require('bcryptjs').hashSync(testUser.password, 10),
            role: 'Cashier'
        });
        expect(user.username).toBe(testUser.username);
    });

    test('Should login and receive a token', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                username: testUser.username,
                password: testUser.password
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.token).toBeDefined();
        userToken = res.body.token;

        // Verify session was created
        const session = await Session.findOne({ where: { token: userToken } });
        expect(session).toBeDefined();
        expect(session.isActive).toBe(true);
    });

    test('Should get current user profile', async () => {
        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.username).toBe(testUser.username);
    });

    test('Should register biometric ID', async () => {
        const biometricId = 'test-bio-id-123';
        const res = await request(app)
            .post('/api/auth/register-biometric')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ biometricId });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toContain('successfully');

        const user = await User.findOne({ where: { username: testUser.username } });
        expect(user.biometricId).toBe(biometricId);
    });

    test('Should login with biometric ID', async () => {
        const biometricId = 'test-bio-id-123';
        const res = await request(app)
            .post('/api/auth/biometric-login')
            .send({ biometricId });

        expect(res.statusCode).toBe(200);
        expect(res.body.token).toBeDefined();
    });

    test('Should logout and invalidate session', async () => {
        const res = await request(app)
            .post('/api/auth/logout')
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.statusCode).toBe(200);

        // Verify session is inactive
        const session = await Session.findOne({ where: { token: userToken } });
        expect(session.isActive).toBe(false);

        // Verify next request fails
        const profileRes = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${userToken}`);

        expect(profileRes.statusCode).toBe(401);
    });

    test('Should restrict role assignment to Admins', async () => {
        const adminTokenRes = await request(app)
            .post('/api/auth/login')
            .send({
                username: testUser.username,
                password: testUser.password
            });

        const token = adminTokenRes.body.token;

        // First, make the test user an Admin so they can try to assign roles
        const user = await User.findOne({ where: { username: testUser.username } });
        user.role = 'Admin';
        await user.save();

        // Create a second user to change their role
        const user2 = await User.create({
            username: 'user2',
            password: require('bcryptjs').hashSync('password123', 10),
            email: 'user2@example.com',
            fullName: 'User Two',
            role: 'Cashier'
        });

        // Admin should be able to update role
        const res = await request(app)
            .put(`/api/auth/users/${user2.id}/role`)
            .set('Authorization', `Bearer ${token}`)
            .send({ role: 'Manager' });

        expect(res.statusCode).toBe(200);
        expect(res.body.data.role).toBe('Manager');

        // Make the test user a Cashier again
        user.role = 'Cashier';
        await user.save();

        // Cashier should NOT be able to update role
        const resFail = await request(app)
            .put(`/api/auth/users/${user2.id}/role`)
            .set('Authorization', `Bearer ${token}`)
            .send({ role: 'Admin' });

        expect(resFail.statusCode).toBe(403);
    });
});
