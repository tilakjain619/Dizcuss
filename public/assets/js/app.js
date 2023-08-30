const discussionsContainer = document.getElementById('discussions');
const modal = document.getElementById('myModal');
const span = document.getElementsByClassName('close')[0];
const replyContentInput = document.getElementById('replyContent');
const submitReplyButton = document.getElementById('submitReply');
let currentDiscussionId = '';

const showToast = (toastMessage) => {
    Toastify({
      text: toastMessage,
      duration: 3000,
      style: {
        background: "#fccb06",
        color: "#000"
      }
    }).showToast();
  };

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

async function fetchDiscussions() {
    discussionsContainer.innerHTML = '';

    try {
        const response = await fetch('/api/discussions');
        discussions = await response.json();

        discussions.forEach(discussion => {
            const discussionElement = document.createElement('div');
            discussionElement.innerHTML = `
                <p><img src="/uploads/${discussion.profileImage}" alt="Profile Image"> 
                ${discussion.username}</p>
                <p>${discussion.content}</p>
                <button class="reply-button" data-id="${discussion._id}">Reply</button>
                <button class="like-discussion-button" data-id="${discussion._id}">Like (${discussion.likes})</button>
                <button class="dislike-discussion-button" data-id="${discussion._id}">Dislike (${discussion.dislikes})</button>
                <button class="delete-discussion-button" data-id="${discussion._id}">Delete</button>
            `;

            const repliesContainer = document.createElement('div');
            discussion.replies.forEach(reply => {
                const replyElement = document.createElement('div');
                replyElement.innerHTML = `
                    <p><strong>Posted by:</strong> ${reply.username}</p>
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

// ...


// ...

async function handleLikeDislike(event, isLike) {
    const id = event.target.getAttribute('data-id');
    const endpoint = isLike ? 'likes' : 'dislikes';
  
    try {
      const response = await fetch(`/api/${endpoint}/${id}`, {
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
  
  // Add an event listener to like and dislike buttons
  discussionsContainer.addEventListener('click', event => {
    if (event.target.classList.contains('like-button')) {
        console.log('Like button clicked');
      handleLikeDislike(event, true);
    } else if (event.target.classList.contains('dislike-button')) {
        console.log('Dislike button clicked');
      handleLikeDislike(event, false);
    }
  });
  
  function updateLikeDislikeCount(button, isLike, increment) {
    const countElement = button.querySelector('.count');
    let count = countElement.textContent;
  
    if (increment) {
      count++;
    } else {
      count--;
    }
  
    countElement.textContent = count;
  }
  

discussionsContainer.addEventListener('click', event => {
    if (event.target.classList.contains('like-discussion-button')) {
        handleLikeDislike(event, true);
    } else if (event.target.classList.contains('dislike-discussion-button')) {
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

    const newReply = {
        content,
        profileImage: profileImageURL // Use the stored profile image URL
    };

    try {
        const response = await fetch(`/api/discussions/${currentDiscussionId}/replies`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newReply)
        });

        if (response.ok) {
            modal.style.display = 'none';
            fetchDiscussions();
        } else {
            alert('Error adding reply');
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
    // chnaged discussion from discussions
    const discussion = discussion.find(discussion => discussion._id === discussionId);

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
    
    const newDiscussion = {
        content,
        profileImage: profileImageURL // Use the stored profile image URL
    };

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
            showToast("Discussion started");
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
            showToast("Discussion deleted")
            fetchDiscussions(); // Refresh discussions after deletion
        } else {
            alert('Error deleting discussion');
        }
    } catch (error) {
        console.error('Error deleting discussion:', error);
    }
}

// fetchDiscussions();

