const discussionsContainer = document.getElementById('discussions');
const modal = document.getElementById('myModal');
const span = document.getElementsByClassName('close')[0];
const replyContentInput = document.getElementById('replyContent');
const submitReplyButton = document.getElementById('submitReply');
let currentDiscussionId = '';

async function fetchDiscussions() {
    discussionsContainer.innerHTML = '';

    try {
        const response = await fetch('/api/discussions');
        discussions = await response.json();

        discussions.forEach(discussion => {
            const discussionElement = document.createElement('div');
            discussionElement.innerHTML = `
                <h2>${discussion.title}</h2>
                <p>${discussion.content}</p>
                <button class="reply-button" data-id="${discussion._id}">Reply</button>
            `;

            const repliesContainer = document.createElement('div');
            discussion.replies.forEach(reply => {
                const replyElement = document.createElement('div');
                replyElement.innerHTML = `
                    <p>${reply.content}</p>
                    <div>
                        <button class="like-button" data-id="${reply._id}">Like (${reply.likes})</button>
                        <button class="dislike-button" data-id="${reply._id}">Dislike (${reply.dislikes})</button>
                    </div>
                `;
                repliesContainer.appendChild(replyElement);
            });

            discussionElement.appendChild(repliesContainer);
            discussionsContainer.appendChild(discussionElement);
        });
    } catch (error) {
        console.error('Error fetching discussions:', error);
    }
}

async function handleLikeDislike(event, isLike) {
    const replyId = event.target.getAttribute('data-id');

    try {
        const response = await fetch(`/api/replies/${replyId}/${isLike ? 'like' : 'dislike'}`, {
            method: 'PUT'
        });

        if (response.ok) {
            fetchDiscussions();
        }
    } catch (error) {
        console.error('Error handling like/dislike:', error);
    }
}

discussionsContainer.addEventListener('click', event => {
    if (event.target.classList.contains('like-button')) {
        handleLikeDislike(event, true);
    } else if (event.target.classList.contains('dislike-button')) {
        handleLikeDislike(event, false);
    } else if (event.target.classList.contains('reply-button')) {
        currentDiscussionId = event.target.getAttribute('data-id');
        modal.style.display = 'block';
    }
});

span.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', event => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

submitReplyButton.addEventListener('click', async () => {
    const content = replyContentInput.value;
    if (content.trim() === '') {
        alert('Please enter a valid reply content.');
        return;
    }

    try {
        const response = await fetch(`/api/discussions/${currentDiscussionId}/replies`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });

        if (response.ok) {
            modal.style.display = 'none';
            fetchDiscussions();
        }
    } catch (error) {
        console.error('Error adding reply:', error);
    }
});
// ...

// Open popup when "Reply" button is clicked
discussionsContainer.addEventListener('click', event => {
    if (event.target.classList.contains('reply-button')) {
        const discussionId = event.target.getAttribute('data-id');
        openPopupWithReplies(discussionId);
    } else if (event.target.classList.contains('like-button')) {
        handleLikeDislike(event, true);
    } else if (event.target.classList.contains('dislike-button')) {
        handleLikeDislike(event, false);
    }
});

function openPopupWithReplies(discussionId) {
    const discussion = discussions.find(discussion => discussion._id === discussionId);

    const popupContent = document.createElement('div');
    popupContent.innerHTML = `
        <h2>${discussion.title}</h2>
        <p>${discussion.content}</p>
    `;

    const repliesContainer = document.createElement('div');
    discussion.replies.forEach(reply => {
        const replyElement = document.createElement('div');
        replyElement.innerHTML = `
            <p>${reply.content}</p>
            <button class="like-button" data-id="${reply._id}">Like</button>
            <button class="dislike-button" data-id="${reply._id}">Dislike</button>
        `;
        repliesContainer.appendChild(replyElement);
    });

    popupContent.appendChild(repliesContainer);
    openPopup(popupContent);
}

function openPopup(content) {
    const popup = document.getElementById('popup');
    const popupContent = popup.querySelector('.popup-content');
    const closePopupButton = popup.querySelector('.close-popup');

    popupContent.innerHTML = '';
    popupContent.appendChild(content);
    popup.style.display = 'block';

    closePopupButton.addEventListener('click', () => {
        popup.style.display = 'none';
    });
}

// ...

fetchDiscussions();

