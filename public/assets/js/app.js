const discussionsContainer = document.getElementById('discussions');
const modal = document.getElementById('myModal');
const span = document.getElementsByClassName('close')[0];
const replyContentInput = document.getElementById('replyContent');
const submitReplyButton = document.getElementById('submitReply');
let currentDiscussionId = '';

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

async function fetchDiscussions() {
    discussionsContainer.innerHTML = '';

    try {
        const response = await fetch('/api/discussions');
        discussions = await response.json();

        discussions.forEach(discussion => {
            const discussionElement = document.createElement('div');
            discussionElement.innerHTML = `
                <p>${discussion.content}</p>
                <button class="reply-button" data-id="${discussion._id}">Reply</button>
                <button class="like-discussion-button" data-id="${discussion._id}">Like (${discussion.likes})</button>
  <button class="dislike-discussion-button" data-id="${discussion._id}">Dislike (${discussion.dislikes})</button>
  <button class="delete-discussion-button" data-id="${discussion._id}">Delete</button> <!-- Add this line -->
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
        const button = event.target;
        const oppositeButton = isLike ? button.nextElementSibling : button.previousElementSibling;
  
        button.classList.toggle('active');
        oppositeButton.classList.remove('active');
  
        updateLikeDislikeCount(button, isLike, true);
        updateLikeDislikeCount(oppositeButton, !isLike, false);
      }
    } catch (error) {
      console.error('Error handling like/dislike:', error);
    }
  }
  function updateLikeDislikeCount(button, isLike, increment) {
    const countElement = button.querySelector('.count');
    let count = parseInt(countElement.innerText);
  
    if (increment) {
      count++;
    } else {
      count--;
    }
  
    countElement.innerText = count;
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
    else if (event.target.classList.contains('delete-discussion-button')) {
        const discussionId = event.target.getAttribute('data-id');
        const confirmDelete = confirm('Are you sure you want to delete this discussion?');
        if (confirmDelete) {
            deleteDiscussion(discussionId);
        }
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
    // Inside discussionsContainer.addEventListener
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
      <p>${discussion.content}</p>
    `;

    const repliesContainer = document.createElement('div');
    discussion.replies.forEach(reply => {
        const replyElement = document.createElement('div');
        replyElement.innerHTML = `
        <p>${reply.content}</p>
        <div>
          <button class="like-button" data-id="${reply._id}">Like</button>
          <button class="dislike-button" data-id="${reply._id}">Dislike</button>
        </div>
      `;
        repliesContainer.appendChild(replyElement);
    });

    popupContent.appendChild(repliesContainer);
    openPopup(popupContent); // <-- Corrected line
}

span.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', event => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});


const discussionForm = document.getElementById('discussion-form');
discussionForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const content = document.getElementById('content').value;

    if (!content) {
        alert('Please fill in all fields');
        return;
    }

    const newDiscussion = { content };

    try {
        const response = await fetch('/api/discussions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newDiscussion)
        });

        if (response.ok) {
            fetchDiscussions(); // Refresh discussions after creating a new one
            discussionForm.reset(); // Clear the form
        } else {
            alert('Error creating discussion');
        }
    } catch (error) {
        console.error('Error creating discussion:', error);
    }
});
async function deleteDiscussion(discussionId) {
    try {
        const response = await fetch(`/api/discussions/${discussionId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Discussion deleted successfully');
            fetchDiscussions(); // Refresh discussions after deletion
        } else {
            alert('Error deleting discussion');
        }
    } catch (error) {
        console.error('Error deleting discussion:', error);
    }
}

fetchDiscussions();

