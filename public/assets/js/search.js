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
                    const discussionItem = document.createElement("li");
                    const discussionLink = document.createElement("a");
                    discussionLink.href = `/discussion/${discussion._id}`;
                    discussionLink.textContent = discussion.content;
                    discussionItem.appendChild(discussionLink);
                    discussionResults.appendChild(discussionItem);
                });
            } else {
                discussionResults.textContent = "No discussions found.";
            }

            // Populate user results
            if (userData.users.length > 0) {
                userData.users.forEach((user) => {
                    const userItem = document.createElement("li");
                    const userLink = document.createElement("a");
                    userLink.href = `/member/${user.username}`;
                    userLink.textContent = user.username;
                    userItem.appendChild(userLink);
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