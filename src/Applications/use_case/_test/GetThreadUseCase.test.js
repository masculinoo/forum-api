const GetThreadUseCase = require('../GetThreadUseCase');
const CommentRepository = require('../../../Domains/comments/CommentRepository');
const ReplyRepository = require('../../../Domains/replies/ReplyRepository');
const ThreadRepository = require('../../../Domains/threads/ThreadRepository');

describe('GetThreadUseCase', () => {
  it('should orchestrating Get Thread action correctly', async () => {
    /** Arrange */
    const threadId = 'thread-1234';

    const mockThread = {
      id: 'thread-1234',
      title: 'sebuah title',
      body: 'sebuah body',
      created_at: '2023',
      username: 'my user',
    };

    const mockComments = [
      {
        id: 'comment-1234',
        username: 'dicoding',
        created_at: '2023',
        content: 'sebuah comment',
        thread_id: 'thread-1234',
        is_delete: false,
      },
    ];

    const mockReplies = [
      {
        id: 'reply-1313',
        username: 'johndoe',
        created_at: '2023',
        content: 'sebuah balasan',
        comment_id: 'comment-1234',
        thread_id: 'thread-1234',
        is_delete: true,
      },
      {
        id: 'reply-1212',
        username: 'dicoding',
        created_at: '2023',
        content: 'sebuah balasan',
        comment_id: 'comment-1234',
        thread_id: 'thread-1234',
        is_delete: false,
      },
    ];

    // creating dependency
    const mockThreadRepository = new ThreadRepository();
    const mockCommentRepository = new CommentRepository();
    const mockReplyRepository = new ReplyRepository();

    // mocking needed function
    mockThreadRepository.verifyAvailableThread = jest.fn().mockImplementation(() => Promise.resolve());
    mockThreadRepository.getThreadById = jest.fn().mockImplementation(() => Promise.resolve(mockThread));
    mockCommentRepository.getCommentByThreadId = jest.fn().mockImplementation(() => Promise.resolve(mockComments));
    mockReplyRepository.getReplyCommentByThreadId = jest.fn().mockImplementation(() => Promise.resolve(mockReplies));

    // creating use case instance
    const getThreadUseCase = new GetThreadUseCase({
      threadRepository: mockThreadRepository,
      commentRepository: mockCommentRepository,
      replyRepository: mockReplyRepository,
    });

    // Action
    const getThreadById = await getThreadUseCase.execute(threadId);

    // Assert
    expect(getThreadById).toEqual({
      id: 'thread-1234',
      title: 'sebuah title',
      body: 'sebuah body',
      date: '2023',
      username: 'my user',
      comments: [
        {
          id: 'comment-1234',
          username: 'dicoding',
          date: '2023',
          replies: [
            {
              id: 'reply-1313',
              content: '**balasan telah dihapus**',
              date: '2023',
              username: 'johndoe',
            },
            {
              id: 'reply-1212',
              content: 'sebuah balasan',
              date: '2023',
              username: 'dicoding',
            },
          ],
          content: 'sebuah comment',
        },
      ],
    });
    expect(mockThreadRepository.verifyAvailableThread).toBeCalledWith(threadId);
    expect(mockThreadRepository.getThreadById).toBeCalledWith(threadId);
    expect(mockCommentRepository.getCommentByThreadId).toBeCalledWith(threadId);
    expect(mockReplyRepository.getReplyCommentByThreadId).toBeCalledWith(threadId);
  });
});
