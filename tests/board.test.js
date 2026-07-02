const request = require('supertest');
const app = require('../src/app');

async function registerAndLogin(email = 'owner@example.com') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Owner', email, password: 'password123' });
  return res.body.data.accessToken;
}

describe('Boards & Tasks', () => {
  it('creates a board with default columns', async () => {
    const token = await registerAndLogin();
    const res = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Sprint 1' });

    expect(res.status).toBe(201);
    expect(res.body.data.columns).toEqual(['To Do', 'In Progress', 'Done']);
  });

  it('rejects board access from a different user (ownership check)', async () => {
    const tokenA = await registerAndLogin('a@example.com');
    const tokenB = await registerAndLogin('b@example.com');

    const board = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 'Private board' });

    const res = await request(app)
      .get(`/api/boards/${board.body.data._id}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
  });

  it('creates a task on a board and lists it back', async () => {
    const token = await registerAndLogin();
    const board = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Sprint 1' });

    const task = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Write tests', board: board.body.data._id, priority: 'high' });

    expect(task.status).toBe(201);
    expect(task.body.data.column).toBe('To Do');

    const boardDetail = await request(app)
      .get(`/api/boards/${board.body.data._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(boardDetail.body.data.tasks).toHaveLength(1);
  });

  it('renaming a board column moves its tasks to the new name', async () => {
    const token = await registerAndLogin();
    const board = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Sprint 1', columns: ['To Do', 'Done'] });

    const task = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Task A', board: board.body.data._id, column: 'To Do' });

    await request(app)
      .put(`/api/boards/${board.body.data._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ columns: ['Backlog', 'Done'] });

    const boardDetail = await request(app)
      .get(`/api/boards/${board.body.data._id}`)
      .set('Authorization', `Bearer ${token}`);

    const migratedTask = boardDetail.body.data.tasks.find((t) => t._id === task.body.data._id);
    expect(migratedTask.column).toBe('Backlog');
  });

  it('rejects bulk reorder containing a task owned by another user', async () => {
    const tokenA = await registerAndLogin('a2@example.com');
    const tokenB = await registerAndLogin('b2@example.com');

    const boardB = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ title: "B's board" });

    const taskB = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ title: "B's task", board: boardB.body.data._id });

    const res = await request(app)
      .put('/api/tasks/reorder/bulk')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ tasks: [{ _id: taskB.body.data._id, column: 'Done', order: 0 }] });

    expect(res.status).toBe(403);
  });
});
