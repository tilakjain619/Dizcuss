const discussionsContainer = document.getElementById('discussions');
// const modal = document.getElementById('myModal');
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
  function formatTimestamp(createdAt) {
    const now = new Date();
    const diffInMilliseconds = now - createdAt;
  
    if (diffInMilliseconds < 60000) {
      return `${Math.floor(diffInMilliseconds / 1000)} seconds ago`;
    } else if (diffInMilliseconds < 3600000) {
      return `${Math.floor(diffInMilliseconds / 60000)} minutes ago`;
    } else if (diffInMilliseconds < 86400000) {
      return `${Math.floor(diffInMilliseconds / 3600000)} hours ago`;
    } else {
      return `${Math.floor(diffInMilliseconds / 86400000)} days ago`;
    }
  }
  
  function openPopup(content) {
      const popup = document.getElementById('popup');
      const popupContent = popup.querySelector('.popup-content');
      const closePopupButton = popup.querySelector('.close-popup');
      
      popupContent.innerHTML = '';
      popupContent.appendChild(content);
      popup.style.display = 'grid';
      
      closePopupButton.addEventListener('click', () => {
          popup.style.display = 'none';
    });
}

// ...
async function fetchDiscussions(user) {
    discussionsContainer.innerHTML = '';
    
    try {
        window.location.reload()
        const response = await fetch('/api/discussions');
        discussions = await response.json();
        // Reverse the discussions array to show most recent discussions first
        discussions.reverse();
        discussions.forEach(discussion => {
            const discussionElement = document.createElement('div');
            const createdAt = new Date(discussion.createdAt);
            const formattedTimestamp = formatTimestamp(createdAt);
            // Get the count of replies for this discussion
            const replyCount = discussion.replies.length;

            let deleteButtonHTML = '';

            if (user && user._id.toString() === discussion.user._id.toString()) {
                deleteButtonHTML = `<button class="delete-discussion-button discussion-btn" data-id="${discussion._id}">Delete</button>`;
            }        
            
            discussionElement.innerHTML = `
            <div class="discussion-card">
            <a href="/member/${discussion.user.username}">
                <p class="user-name">@${discussion.user.username}</p>
                </a>
                <a href="/discussion/${discussion._id}">
                        <p class="discussion-title" data-id="${discussion._id}">
                            ${discussion.content}
                        </p>
                    </a>
                <p class="discussion-time">${formattedTimestamp}</p>
                <div class="discussion-toolbar">
                <a class="reply-button discussion-btn" href="/discussion/${discussion._id}"><p class="reply-count">${replyCount} Replies</p></a>
                <button class="like-discussion-button discussion-btn" data-id="${discussion._id}">
                            <i class="fa fa-thumbs-up" aria-hidden="true"></i>
                            <span class="count">
                                ${discussion.likes}
                            </span>
                        </button>
                    ${deleteButtonHTML}
                    </div>
            </div>
            `;
            // show replies on feed -------------
            // const repliesContainer = document.createElement('div');
            // discussion.replies.forEach(reply => {
            //     const replyElement = document.createElement('div');
            //     replyElement.innerHTML = `
            //         <p><strong>Posted by:</strong> ${reply.user.username}</p>
            //         <p>${reply.content}</p>
            //         <div>
            //             <button class="like-button" data-id="${reply._id}">Like (${reply.likes})</button>
            //             <button class="dislike-button" data-id="${reply._id}">Dislike (${reply.dislikes})</button>
            //         </div>
            //     `;
            //     repliesContainer.appendChild(replyElement);
            // });

            // discussionElement.appendChild(repliesContainer);
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
  
    try {
      const response = await fetch(`/api/likes/${id}`, {
        method: 'PUT'
      });
  
      if (response.ok) {
        const button = event.target;
        const oppositeButton = isLike ? button.nextElementSibling : button.previousElementSibling;
  
        button.classList.toggle('like-active');
        button.classList.toggle('liked');
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
    }
    else if (event.target.classList.contains('delete-discussion-button')) {
        const discussionId = event.target.getAttribute('data-id');
        const confirmDelete = confirm('Are you sure you want to delete this discussion?');
        if (confirmDelete) {
            deleteDiscussion(discussionId);
        }
    }
});

// submitReplyButton.addEventListener('click', async () => {
//     const content = replyContentInput.value;
//     if (content.trim() === '') {
//         alert('Please enter a valid reply content.');
//         return;
//     }

//     const newReply = {
//         content
//     };

//     try {
//         const response = await fetch(`/api/discussions/${currentDiscussionId}/replies`, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify(newReply)
//         });

//         if (response.ok) {
//             modal.style.display = 'none';
//             fetchDiscussions();
//         } else {
//             alert('Error adding reply');
//         }
//     } catch (error) {
//         console.error('Error adding reply:', error);
//     }
// });


// Open popup when "Reply" button is clicked
discussionsContainer.addEventListener('click', event => {
    if (event.target.classList.contains('reply-button')) {
        const discussionId = event.target.getAttribute('data-id');
        // Handle opening the reply popup here if needed
    } else if (event.target.classList.contains('like-button')) {
        handleLikeDislike(event, true);
    }
});

// ...

const discussionForm = document.getElementById('discussion-form');


discussionForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const content = document.getElementById('content').value;
    
    if (content === "") {
        showToast("Please write something!")
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
            showToast('Error deleting discussion');
        }
    } catch (error) {
        console.error('Error deleting discussion:', error);
    }
}
// Add an event listener to the delete-reply button
// Example event listener for delete buttons within replies

//------------
async function deleteReply(replyId) {
    try {
        const response = await fetch(`/api/replies/${replyId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast("Reply deleted");
            window.location.reload()
        } else {
            showToast('Error deleting reply');
        }
    } catch (error) {
        console.error('Error deleting reply:', error);
    }
}



//-------------------
async function fetchUserData(username) {
    try {
        const response = await fetch(`/${username}`); // Assuming you have an API endpoint for fetching user data
        if (response.ok) {
            const userData = await response.json();
            return userData;
        } else {
            // Handle the case when the response is not okay (e.g., user not found)
            return null;
        }
    } catch (error) {
        // Handle any errors that occur during data fetching
        throw error;
    }
}

//   show popup for discussionTitle
document.addEventListener("DOMContentLoaded", () => {
    const discussionTitles = document.querySelectorAll(".discussion-title");
  
    discussionTitles.forEach((title) => {
      title.addEventListener("click", async (event) => {
        const discussionId = event.target.getAttribute("data-id");
        const popup = document.getElementById("popup");
        const discussionPopup = document.getElementById("discussion-popup");
        const repliesPopup = document.getElementById("replies-popup");
  
        try {
          const response = await fetch(`/api/discussions/${discussionId}`);
          if (!response.ok) {
            throw new Error(`Error fetching discussion: ${response.status} ${response.statusText}`);
          }
  
          const data = await response.json();
  
          // Populate the discussion and replies in the popup
          discussionPopup.innerHTML = `<div id="discussions"><p>${data.content}</p>
          <button class="reply-button discussion-btn" data-id="${data._id}">Reply</button>`;
          repliesPopup.innerHTML = data.replies
          .map((reply) => `
          <div>
                                <p>
                                    @${reply.user.username}
                                </p>
                                <p>
                                    ${reply.content}
                                </p>
                                <p class="reply-time">${ formatTimestamp(reply.createdAt) }</p>
                                <button class="like-button discussion-btn" data-id="${reply._id}">Like (${reply.likes}
                                        )</button>
                                <button class="dislike-button discussion-btn" data-id="${reply._id}">Dislike (${reply.dislikes}
                                        )</button>
                            </div></div>
            `)
            .join("");
  
          // Display the popup
          popup.style.display = "block";
        } catch (error) {
          console.error("Error fetching discussion:", error);
          // Handle the error, e.g., display an error message to the user
        }
      });
    });
  
    // Close popup when the close button is clicked
    const closePopup = document.querySelector(".close-popup");
    closePopup.addEventListener("click", () => {
      const popup = document.getElementById("popup");
      popup.style.display = "none";
    });
  });

// fetchDiscussions();
function reportContent(type, id) {
    const reason = prompt('Please provide a reason for reporting this content:');
    
    if (reason) {
      fetch('/api/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, type, reason }),
      })
      .then(response => {
        if (response.ok) {
          alert('Content reported successfully. Thank you for your report.');
        } else {
          throw new Error('An error occurred while reporting the content.');
        }
      })
      .catch(error => {
        alert(error.message || 'An error occurred while reporting the content. Please try again later.');
        console.error(error);
      });
    }
  }
  