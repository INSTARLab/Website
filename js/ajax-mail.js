document.addEventListener("DOMContentLoaded", function () {
	var form = document.getElementById("contact-form");
	if (!form) return;

	var formMessages = document.querySelector(".form-messege");

	form.addEventListener("submit", function (e) {
		e.preventDefault();

		fetch(form.getAttribute("action"), {
			method: "POST",
			body: new FormData(form),
			headers: { Accept: "application/json" },
		})
			.then(function (response) {
				if (response.ok) {
					if (formMessages) {
						formMessages.classList.remove("error");
						formMessages.classList.add("success");
						formMessages.textContent = "Thanks for reaching out — we'll be in touch soon.";
					}
					form.reset();
				} else {
					return response.json().then(function (data) {
						throw new Error(
							(data && data.errors && data.errors.map(function (er) { return er.message; }).join(", ")) ||
								"Oops! An error occurred and your message could not be sent."
						);
					});
				}
			})
			.catch(function (err) {
				if (formMessages) {
					formMessages.classList.remove("success");
					formMessages.classList.add("error");
					formMessages.textContent = err.message || "Oops! An error occurred and your message could not be sent.";
				}
			});
	});
});
