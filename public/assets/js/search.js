document.addEventListener("DOMContentLoaded", () => {
    const discussionResults = document.getElementById("discussionResults");
    const userResults = document.getElementById("userResults");
    const searchInput = document.getElementById("searchInput");

    // Function to perform a search and update the results
    const performSearch = async (searchTerm) => {
        try {
            // Clear previous results
            discussionResults.innerHTML = "";
            userResults.innerHTML = "";

            // Perform an API request to your server to search for discussions and users
            const discussionResponse = await fetch(`/search/discussions?q=${searchTerm}`);
            const userResponse = await fetch(`/search/users?q=${searchTerm}`);

            if (!discussionResponse.ok) {
                throw new Error(`Error searching discussions: ${discussionResponse.status} ${discussionResponse.statusText}`);
            }
            if (!userResponse.ok) {
                throw new Error(`Error searching users: ${userResponse.status} ${userResponse.statusText}`);
            }

            const discussionData = await discussionResponse.json();
            const userData = await userResponse.json();

            // Populate discussion results
            if (discussionData.discussions.length > 0) {
                discussionData.discussions.forEach((discussion) => {
                    const discussionItemHTML = `<li>
                        <a href="/discussion/${discussion._id}">${discussion.content}</a>
                    </li>`;
            
                    const discussionItem = document.createElement("div");
                    discussionItem.innerHTML = discussionItemHTML;
                    
                    discussionResults.appendChild(discussionItem.firstChild);
                });
            }
             else {
                discussionResults.textContent = "No discussions found.";
            }

            // Populate user results
            if (userData.users.length > 0) {
                userData.users.forEach((user) => {
                    const userItem = document.createElement("a");
                    const userNameSearch = document.createElement("li");
                    userNameSearch.classList.add("search-fullname");
                    userNameSearch.textContent = user.fullName;
                    const userLink = document.createElement("p");
                    userItem.href = `/member/${user.username}`;
                    userLink.textContent = `@${user.username}`;
                    userLink.classList.add("search-username");
                    userNameSearch.appendChild(userLink);
                    userItem.appendChild(userNameSearch);
                    userResults.appendChild(userItem);
                });
            } else {
                userResults.textContent = "No users found.";
            }
        } catch (error) {
            console.error("Error searching:", error);
            // Handle the error, e.g., display an error message to the user
        }
    };

    // Listen for changes in the search input field
    searchInput.addEventListener("input", () => {
        const searchTerm = searchInput.value.trim();
        if (searchTerm.length > 0) {
            performSearch(searchTerm);
        } else {
            // Clear results if the search input is empty
            discussionResults.innerHTML = "";
            userResults.innerHTML = "";
        }
    });
});

let tabs = document.querySelector(".tabs");
let tabHeader = tabs.querySelector(".tab-header");
let tabHeaderElements = tabs.querySelectorAll(".tab-header > div");
let tabBody = tabs.querySelector(".tab-body");
let tabBodyElements = tabs.querySelectorAll(".tab-body > div");
let tabIndicator = tabs.querySelector(".tab-indicator > div");

for (let i = 0; i < tabHeaderElements.length; i++) {
    tabHeaderElements[i].addEventListener("click", function () {
        tabHeader.querySelector(".active").classList.remove("active");
        tabHeaderElements[i].classList.add("active");
        tabBody.querySelector(".active").classList.remove("active");
        tabBodyElements[i].classList.add("active");
        tabIndicator.style.left = `${i * 110}px`;
    });
}