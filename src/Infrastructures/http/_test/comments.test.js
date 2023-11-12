const CommentsTableTestHelper = require('../../../../tests/CommentsTableTestHelper');
const ThreadsTableTestHelper = require('../../../../tests/ThreadsTableTestHelper');
const UsersTableTestHelper = require('../../../../tests/UsersTableTestHelper');
const container = require('../../container');
const pool = require('../../database/postgres/pool');
const createServer = require('../createServer');

describe('/threads/{threadId}/comments endpoint', () => {
  let accessTokenUserA = '';
  let accessTokenUserB = '';
  let threadId = '';
  let commentId = '';

  beforeAll(async () => {
    const server = await createServer(container);

    const createUserALoginPayload = {
      username: 'usera',
      password: 'secret',
    };

    await server.inject({
      method: 'POST',
      url: '/users',
      payload: {
        username: 'usera',
        password: 'secret',
        fullname: 'User A',
      },
    });
    const responseUserALogin = await server.inject({
      method: 'POST',
      url: '/authentications',
      payload: createUserALoginPayload,
    });

    const responseJsonUserALogin = JSON.parse(responseUserALogin.payload);
    const { accessToken: resultTokenUserA } = responseJsonUserALogin.data;
    accessTokenUserA = resultTokenUserA;

    const createUserBLoginPayload = {
      username: 'userb',
      password: 'secret',
    };

    await server.inject({
      method: 'POST',
      url: '/users',
      payload: {
        username: 'userb',
        password: 'secret',
        fullname: 'User B',
      },
    });

    const responseUserBLogin = await server.inject({
      method: 'POST',
      url: '/authentications',
      payload: createUserBLoginPayload,
    });

    const responseJsonUserBLogin = JSON.parse(responseUserBLogin.payload);
    const { accessToken: resultTokenUserB } = responseJsonUserBLogin.data;
    accessTokenUserB = resultTokenUserB;

    const requestPayload = {
      title: 'ini title',
      body: 'ini body',
    };

    const response = await server.inject({
      method: 'POST',
      url: '/threads',
      payload: requestPayload,
      headers: {
        Authorization: `Bearer ${accessTokenUserA}`,
      },
    });

    const responseJson = JSON.parse(response.payload);
    threadId = responseJson.data.addedThread.id;
  });

  afterAll(async () => {
    await ThreadsTableTestHelper.cleanTable();
    await UsersTableTestHelper.cleanTable();
    await CommentsTableTestHelper.cleanTable();
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('when POST /threads/{threadId}/comments', () => {
    it('should response 401 when post comment not authentication', async () => {
      // Arrange
      const requestPayload = {
        content: 'balasan sebuah komentar',
      };
      const server = await createServer(container);

      // Action
      const response = await server.inject({
        method: 'POST',
        url: `/threads/${threadId}/comments`,
        payload: requestPayload,
      });

      // Assert
      const responseJson = JSON.parse(response.payload);
      expect(response.statusCode).toEqual(401);
      expect(responseJson.message).toEqual('Missing authentication');
    });

    it('should response 404 when threadId not available', async () => {
      // Arrange
      const requestPayload = {
        content: 'berisi sebuah comment',
      };
      const fakeThreadId = 'fakeThreadId';
      const server = await createServer(container);

      // Action
      const response = await server.inject({
        method: 'POST',
        url: `/threads/${fakeThreadId}/comments`,
        payload: requestPayload,
        headers: {
          Authorization: `Bearer ${accessTokenUserB}`,
        },
      });

      // Assert
      const responseJson = JSON.parse(response.payload);
      expect(response.statusCode).toEqual(404);
      expect(responseJson.status).toEqual('fail');
      expect(responseJson.message).toEqual('Thread tidak ditemukan');
    });

    it('should response 400 when request payload not meet data type spesification', async () => {
      // Arrange
      const requestPayload = {
        content: true,
      };
      const server = await createServer(container);

      // Action
      const response = await server.inject({
        method: 'POST',
        url: `/threads/${threadId}/comments`,
        payload: requestPayload,
        headers: {
          Authorization: `Bearer ${accessTokenUserB}`,
        },
      });

      // Assert
      const responseJson = JSON.parse(response.payload);
      expect(response.statusCode).toEqual(400);
      expect(responseJson.status).toEqual('fail');
      expect(responseJson.message).toEqual('comment harus berupa string');
    });

    it('should response 201 and persisted comment', async () => {
      // Arrange
      const requestPayload = {
        content: 'berisi sebuah comment',
      };
      const server = await createServer(container);

      // Action
      const response = await server.inject({
        method: 'POST',
        url: `/threads/${threadId}/comments`,
        payload: requestPayload,
        headers: {
          Authorization: `Bearer ${accessTokenUserB}`,
        },
      });
      // set variable commentId
      const responseJson = JSON.parse(response.payload);
      commentId = responseJson.data.addedComment.id;
      const comment = await CommentsTableTestHelper.findCommentById(commentId);

      // Assert
      expect(response.statusCode).toEqual(201);
      expect(comment).toHaveLength(1);
      expect(responseJson).toHaveProperty('status');
      expect(responseJson.status).toEqual('success');
      expect(responseJson).toHaveProperty('data');
      expect(responseJson.data).toHaveProperty('addedComment');
      expect(responseJson.data.addedComment).toBeDefined();
      expect(responseJson.data.addedComment).toHaveProperty('id');
      expect(responseJson.data.addedComment).toHaveProperty('content');
      expect(responseJson.data.addedComment).toHaveProperty('owner');
    });
  });

  /** DELETE COMMENT ENDPOINT */
  describe('when DELETE /threads/{threadId}/comments/{commentId}', () => {
    it('should response 401 when not authentication', async () => {
      // Arrange
      const server = await createServer(container);

      // Action
      const response = await server.inject({
        method: 'DELETE',
        url: `/threads/${threadId}/comments/${commentId}`,
      });

      // Assert
      const responseJson = JSON.parse(response.payload);
      expect(response.statusCode).toEqual(401);
      expect(responseJson.message).toEqual('Missing authentication');
    });

    it('should response 404 when commentId not available', async () => {
      // Arrange
      const fakeCommentId = 'fakeCommentId';
      const server = await createServer(container);

      // Action
      const response = await server.inject({
        method: 'DELETE',
        url: `/threads/${threadId}/comments/${fakeCommentId}`,
        headers: {
          Authorization: `Bearer ${accessTokenUserB}`,
        },
      });

      // Assert
      const responseJson = JSON.parse(response.payload);
      expect(response.statusCode).toEqual(404);
      expect(responseJson.status).toEqual('fail');
      expect(responseJson.message).toEqual('Comment tidak ditemukan');
    });

    it('should response 403 when delete not owner comment', async () => {
      // Arrange
      const server = await createServer(container);

      // Action
      const response = await server.inject({
        method: 'DELETE',
        url: `/threads/${threadId}/comments/${commentId}`,
        headers: {
          Authorization: `Bearer ${accessTokenUserA}`,
        },
      });

      // Assert
      const responseJson = JSON.parse(response.payload);
      expect(response.statusCode).toEqual(403);
      expect(responseJson.status).toEqual('fail');
      expect(responseJson.message).toEqual('Anda tidak berhak mengakses resource ini!');
    });

    it('should response 200 when commentId available and valid owner comment', async () => {
      // Arrange
      const server = await createServer(container);

      // Action
      const response = await server.inject({
        method: 'DELETE',
        url: `/threads/${threadId}/comments/${commentId}`,
        headers: {
          Authorization: `Bearer ${accessTokenUserB}`,
        },
      });
      const comment = await CommentsTableTestHelper.findCommentById(commentId);

      // Assert
      const responseJson = JSON.parse(response.payload);
      expect(comment[0].is_delete).toEqual(true);
      expect(response.statusCode).toEqual(200);
      expect(responseJson.status).toEqual('success');
    });
  });
});
