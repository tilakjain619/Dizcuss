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

async function fetchDiscussions(req) {
    discussionsContainer.innerHTML = '';
    
    try {
        const response = await fetch('/api/discussions');
        discussions = await response.json();
        
        discussions.forEach(discussion => {
            const discussionElement = document.createElement('div');
            discussionElement.innerHTML = `
                <p>
                ${discussion.user.username}</p>
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
                    <p><strong>Posted by:</strong> ${reply.user.username}</p>
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

async function handleLikeDislike(event, isLike, isActive) {
    const id = event.target.getAttribute('data-id');
    const endpoint = isLike ? 'likes' : 'dislikes';
  
    try {
      const response = await fetch(`/api/${endpoint}/${id}`, {
        method: 'PUT'
      });
  
      if (response.ok) {
        const button = event.target;
        const oppositeButton = isLike ? button.nextElementSibling : button.previousElementSibling;
  
        button.classList.toggle('like-active');
        oppositeButton.classList.remove('like-active');
  
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
  
  function updateLikeDislikeCount(button, isActive, isLike, increment) {
    const countElement = button.querySelector('.count');
    let count = parseInt(countElement.textContent);

    if (isActive) {
        if (isLike && !increment) {
            count--; // If it was liked and unliking, decrease count
        } else if (!isLike && increment) {
            count--; // If it was disliked and liking, decrease count
        } else if (isLike && increment) {
            count++; // If it was liked and liking again, increase count
        } else if (!isLike && !increment) {
            count++; // If it was disliked and un-disliking, increase count
        }
    } else {
        if (isLike && increment) {
            count++; // If it was not liked and liking, increase count
        } else if (!isLike && increment) {
            count--; // If it was not liked and disliking, decrease count
        } else if (isLike && !increment) {
            count--; // If it was not liked and unliking, decrease count
        } else if (!isLike && !increment) {
            count++; // If it was not liked and un-disliking, increase count
        }
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
        content
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

const popup = document.getElementById('popup');
const discussionPopup = document.getElementById('discussion-popup');
const repliesPopup = document.getElementById('replies-popup');

// Add a click event listener to discussions
discussionsContainer.addEventListener('click', async (event) => {
    if (event.target.classList.contains('discussion')) {
        const discussionId = event.target.dataset.id;
        const response = await fetch(`/api/discussions/${discussionId}`);
        const data = await response.json();

        // Populate the popup with discussion content
        discussionPopup.innerHTML = `
            <p><strong>@${data.user.username}</strong></p>
            <p>${data.content}</p>
        `;

        // Populate the popup with replies content
        repliesPopup.innerHTML = '';
        data.replies.forEach((reply) => {
            repliesPopup.innerHTML += `
                <div>
                    <p><strong>@${reply.user.username}</strong></p>
                    <p>${reply.content}</p>
                </div>
            `;
        });

        // Display the popup
        popup.style.display = 'block';
    }
});

// Close the popup when the close button is clicked
popup.querySelector('.close-popup').addEventListener('click', () => {
    popup.style.display = 'none';
});

// ...

// Open popup when "Reply" button is clicked
discussionsContainer.addEventListener('click', event => {
    if (event.target.classList.contains('reply-button')) {
        const discussionId = event.target.getAttribute('data-id');
        // Handle opening the reply popup here if needed
    } else if (event.target.classList.contains('like-button')) {
        handleLikeDislike(event, true);
    } else if (event.target.classList.contains('dislike-button')) {
        handleLikeDislike(event, false);
    }
});

// ...



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
        content
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

