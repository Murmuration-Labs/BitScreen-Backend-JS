import { formatDate, formatTime } from './util.service';
import { bitscreenUri, lookingGlassUri } from '../config';
import { Complaint } from '../entity/Complaint';

export const CreateComplaint = {
  subject: 'Complaint Received - Filecoin Network Content',
  text: `Thank you for submitting your complaint regarding content hosted on the Filecoin network. Your complaint will be reviewed by our assessors, and the included CIDs may be added to filter lists for storage providers to optionally subscribe and filter out known CIDs from storage and retrieval deals. We appreciate your efforts in maintaining the network's integrity.

  Upon resolution of your complaint, you will receive a copy of the assessment by email, and a record will be published to our transparency hub.`,
  body: `
  <div>
    Thank you for submitting your complaint regarding content hosted on the Filecoin network. Your complaint will be reviewed by our assessors, and the included CIDs may be added to filter lists for storage providers to optionally subscribe and filter out known CIDs from storage and retrieval deals. We appreciate your efforts in maintaining the network's integrity.
  </div>
  <br>
  <div>
    Upon resolution of your complaint, you will receive a copy of the assessment by email, and a record will be published to our transparency hub.
  </div>`,
};

export const MarkAsSpam = {
  subject: 'Complaint Notice Update - Filecoin Network Content',
  text: ({ _id }: Complaint) =>
    `
      <div>
        Thank you for submitting your complaint regarding content hosted on the Filecoin network. Our assessors have reviewed your complaint and marked it as spam. The complaint record and determination were published to our transparency hub at the address below, and no further action will be taken:
      </div>
      <div>
        <a href="${lookingGlassUri()}/records/${_id}" target="_blank">Link</a>
      </div>
      <div>
        If you believe this determination to have been made in error, please resubmit the complaint using the form below with any additional information that may provide further context to our assessors:
      </div>
      <div>
        <a href="${lookingGlassUri()}/complaint" target="_blank">Link</a>
      </div>
      <div>
        We appreciate your understanding and cooperation.
      </div>
    `,
  body: ({ _id }: Complaint) =>
    `
      <div>
        Thank you for submitting your complaint regarding content hosted on the Filecoin network. Our assessors have reviewed your complaint and marked it as spam. The complaint record and determination were published to our transparency hub at the address below, and no further action will be taken:
      </div>
      <br>
      <div>
        <a href="${lookingGlassUri()}/records/${_id}" target="_blank">Link</a>
      </div>
      <br>
      <div>
        If you believe this determination to have been made in error, please resubmit the complaint using the form below with any additional information that may provide further context to our assessors:
      </div>
      <br>
      <div>
        <a href="${lookingGlassUri()}/complaint" target="_blank">${lookingGlassUri()}/complaint</a>
      </div>
      <br>
      <div>
        We appreciate your understanding and cooperation.
      </div>
    `,
};

export const Reviewed = {
  subject: 'Complaint has been reviewed',
  personalizations: (complaint: Complaint) => {
    const { acceptedInfringements, rejectedInfringements } =
      getAcceptedAndRejectedInfringements(complaint);
    const bitscreenURI = bitscreenUri();
    const lookingGlassURI = lookingGlassUri();
    const assessor = {
      name:
        complaint.assessor.provider.businessName ||
        complaint.assessor.provider.contactPerson,
      link: `${lookingGlassURI}/assessors/${complaint.assessor.id}`,
    };

    return [
      {
        to: { email: complaint.email },
        dynamic_template_data: {
          acceptedInfringements,
          bitscreenURI,
          complaint,
          lookingGlassURI,
          rejectedInfringements,
          assessor,
        },
      },
    ];
  },
};

const getAcceptedAndRejectedInfringements = (complaint: Complaint) => ({
  acceptedInfringements: complaint.infringements.filter(
    (infr) => infr.accepted
  ),
  rejectedInfringements: complaint.infringements.filter(
    (infr) => !infr.accepted
  ),
});
