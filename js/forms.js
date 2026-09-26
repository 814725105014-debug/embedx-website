/**
 * EMBEDX Forms Handling & Validation
 */

document.addEventListener('DOMContentLoaded', () => {

  // 1. Join EMBEDX Application Form
  const joinForm = document.getElementById('joinEmbedxForm');

  if (joinForm) {

    // Restore draft if present
    loadFormDraft(joinForm, 'embedx_join_draft');

    // Auto-save on input
    joinForm.addEventListener('input', () => {
      saveFormDraft(joinForm, 'embedx_join_draft');
    });

    joinForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!validateJoinForm(joinForm)) {
        return;
      }

      const submitButton = joinForm.querySelector('button[type="submit"]');
      const originalButtonHTML = submitButton.innerHTML;

      submitButton.disabled = true;
      submitButton.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> SUBMITTING...';

      try {

        const formData = new FormData(joinForm);

        // Convert FormData to a normal object
        const data = {};

        formData.forEach((value, key) => {

          if (key === 'interests') {

            if (!data.interests) {
              data.interests = [];
            }

            data.interests.push(value);

          } else {

            data[key] = value;

          }

        });

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch('/api/join', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(data),
          signal: controller.signal
        });

        clearTimeout(timeout);

        const responseText = await response.text();

        let result;
        try {
          result = JSON.parse(responseText);
        } catch {
          throw new Error('Invalid response from server.');
        }

        if (!response.ok || result.success !== true) {
          throw new Error(
            result.message || 'Form submission failed.'
          );
        }

        showSubmissionSuccess(
          'Application Submitted Successfully!',
          'Thank you for applying to EMBEDX – Embedded Systems and Automation Club, Department of EEE. Our technical coordination committee will review your submission and contact you regarding the upcoming orientation and domain selection rounds.'
        );

        localStorage.removeItem('embedx_join_draft');
        joinForm.reset();

      } catch (error) {

        console.error('Join form submission error:', error);

        showSubmissionSuccess(
          'Submission Failed',
          'We could not submit your application at this time. Please check your internet connection and try again.'
        );

      } finally {

        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonHTML;

      }
    });
  }


  // 2. Contact Inquiry Form
  const contactForm = document.getElementById('contactForm');

  if (contactForm) {

    contactForm.addEventListener('submit', async (e) => {

      e.preventDefault();

      if (!validateContactForm(contactForm)) {
        return;
      }

      const submitButton =
        contactForm.querySelector('button[type="submit"]');

      const originalButtonHTML = submitButton
        ? submitButton.innerHTML
        : '';

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML =
          '<i class="fa-solid fa-spinner fa-spin"></i> SENDING...';
      }

      try {

        const data = {
          name: document.getElementById('contactName').value.trim(),
          email: document.getElementById('contactEmail').value.trim(),
          subject: document.getElementById('contactSubject').value.trim(),
          message: document.getElementById('contactMessage').value.trim()
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch('/api/inquiry', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(data),
          signal: controller.signal
        });

        clearTimeout(timeout);

        const responseText = await response.text();

        let result;
        try {
          result = JSON.parse(responseText);
        } catch {
          throw new Error('Invalid response from server.');
        }

        if (!response.ok || result.success !== true) {
          throw new Error(
            result.message || 'Message submission failed.'
          );
        }

        showSubmissionSuccess(
          'Message Received!',
          'Thank you for contacting EMBEDX. Your message has been forwarded to the Department of Electrical and Electronics Engineering faculty and student coordinators.'
        );

        contactForm.reset();

      } catch (error) {

        console.error('Contact form submission error:', error);

        showSubmissionSuccess(
          'Submission Failed',
          'We could not send your message at this time. Please check your internet connection and try again.'
        );

      } finally {

        if (submitButton) {
          submitButton.disabled = false;
          submitButton.innerHTML = originalButtonHTML;
        }

      }
    });
  }
});


function validateJoinForm(form) {

  let isValid = true;

  clearValidationErrors(form);

  const fullName = form.querySelector('#fullName');
  const department = form.querySelector('#department');
  const year = form.querySelector('#year');
  const email = form.querySelector('#email');
  const phone = form.querySelector('#phone');
  const interests = form.querySelectorAll(
    'input[name="interests"]:checked'
  );
  const motivation = form.querySelector('#motivation');
  const consent = form.querySelector('#consent');

  if (!fullName.value.trim()) {
    setError(
      fullName,
      'Please provide your full legal name.'
    );
    isValid = false;
  }

  if (!department.value) {
    setError(
      department,
      'Please select your academic department.'
    );
    isValid = false;
  }

  if (!year.value) {
    setError(
      year,
      'Please select your current year of study.'
    );
    isValid = false;
  }

  if (!validateEmail(email.value.trim())) {
    setError(
      email,
      'Please enter a valid academic/personal email address.'
    );
    isValid = false;
  }

  if (!validatePhone(phone.value.trim())) {
    setError(
      phone,
      'Please enter a valid 10-digit mobile contact number.'
    );
    isValid = false;
  }

  if (interests.length === 0) {

    const group = form.querySelector('.interest-tag-group');

    setError(
      group,
      'Please choose at least one technical domain of interest.'
    );

    isValid = false;
  }

  if (
    !motivation.value.trim() ||
    motivation.value.trim().length < 20
  ) {

    setError(
      motivation,
      'Please write a brief statement (at least 20 characters) explaining why you wish to join.'
    );

    isValid = false;
  }

  if (!consent.checked) {

    setError(
      consent,
      'You must agree to participate actively in club technical activities.'
    );

    isValid = false;
  }

  return isValid;
}


function validateContactForm(form) {

  let isValid = true;

  clearValidationErrors(form);

  const name = form.querySelector('#contactName');
  const email = form.querySelector('#contactEmail');
  const message = form.querySelector('#contactMessage');

  if (!name.value.trim()) {

    setError(
      name,
      'Please enter your name.'
    );

    isValid = false;
  }

  if (!validateEmail(email.value.trim())) {

    setError(
      email,
      'Please enter a valid email address.'
    );

    isValid = false;
  }

  if (
    !message.value.trim() ||
    message.value.trim().length < 10
  ) {

    setError(
      message,
      'Please provide a message of at least 10 characters.'
    );

    isValid = false;
  }

  return isValid;
}


function setError(element, message) {

  element.classList.add('is-invalid');

  const parent =
    element.closest('.form-group') ||
    element.parentElement;

  let feedback =
    parent.querySelector('.invalid-feedback');

  if (!feedback) {

    feedback = document.createElement('div');

    feedback.className = 'invalid-feedback';

    parent.appendChild(feedback);
  }

  feedback.textContent = message;
}


function clearValidationErrors(form) {

  form.querySelectorAll('.is-invalid').forEach(el => {
    el.classList.remove('is-invalid');
  });

  form.querySelectorAll('.invalid-feedback').forEach(el => {
    el.remove();
  });
}


function validateEmail(email) {

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


function validatePhone(phone) {

  return /^[0-9+() -]{10,14}$/.test(
    phone.trim()
  );
}


function saveFormDraft(form, storageKey) {

  const data = {};

  const inputs =
    form.querySelectorAll('input, select, textarea');

  inputs.forEach(input => {

    if (input.type === 'checkbox') {

      if (input.name === 'interests') {

        if (!data.interests) {
          data.interests = [];
        }

        if (input.checked) {
          data.interests.push(input.value);
        }

      } else {

        data[input.id || input.name] =
          input.checked;

      }

    } else {

      data[input.id || input.name] =
        input.value;

    }
  });

  localStorage.setItem(
    storageKey,
    JSON.stringify(data)
  );
}


function loadFormDraft(form, storageKey) {

  try {

    const raw =
      localStorage.getItem(storageKey);

    if (!raw) {
      return;
    }

    const data = JSON.parse(raw);

    Object.keys(data).forEach(key => {

      const input =
        form.querySelector(`#${key}`) ||
        form.querySelector(`[name="${key}"]`);

      if (input) {

        if (input.type === 'checkbox') {

          input.checked = data[key];

        } else {

          input.value = data[key];

        }
      }
    });

    if (
      data.interests &&
      Array.isArray(data.interests)
    ) {

      data.interests.forEach(val => {

        const chk =
          form.querySelector(
            `input[name="interests"][value="${val}"]`
          );

        if (chk) {
          chk.checked = true;
        }

      });
    }

  } catch (err) {

    console.error(
      'Could not load draft',
      err
    );

  }
}


function showSubmissionSuccess(title, message) {

  let modal =
    document.getElementById(
      'globalFeedbackModal'
    );

  if (!modal) {

    modal = document.createElement('div');

    modal.id =
      'globalFeedbackModal';

    modal.className =
      'modal-backdrop';

    modal.innerHTML = `
      <div class="modal-dialog text-center" style="max-width: 500px;">

        <button
          class="modal-close-btn"
          onclick="this.closest('.modal-backdrop').classList.remove('open')"
        >
          &times;
        </button>

        <div
          style="
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: rgba(20, 107, 58, 0.1);
            color: var(--engineering-green);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            margin: 0 auto 1.25rem;
          "
        >
          <i class="fa-solid fa-check"></i>
        </div>

        <h3
          id="feedbackModalTitle"
          class="text-navy"
          style="margin-bottom: 0.75rem;"
        >
          ${title}
        </h3>

        <p
          id="feedbackModalMessage"
          class="text-muted"
          style="margin-bottom: 1.5rem;"
        >
          ${message}
        </p>

        <button
          class="btn btn-primary"
          onclick="this.closest('.modal-backdrop').classList.remove('open')"
        >
          Close
        </button>

      </div>
    `;

    document.body.appendChild(modal);

  } else {

    document.getElementById(
      'feedbackModalTitle'
    ).textContent = title;

    document.getElementById(
      'feedbackModalMessage'
    ).textContent = message;
  }

  setTimeout(() => {
    modal.classList.add('open');
  }, 10);
}