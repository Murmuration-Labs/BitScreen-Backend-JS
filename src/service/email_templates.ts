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
  subject: 'Complaint has been marked as spam',
  text: ({ _id, created }: Complaint) =>
    `Your complaint filed on ${formatDate(created)} at ${formatTime(
      created
    )}, with ID number ${_id}, was rejected as spam. If you believe this action to be in error, please file the complaint again at ${lookingGlassUri()}/complaint with any additional elements which may help us correct the error.`,
  body: ({ _id, created }: Complaint) =>
    `<p>Your complaint filed on ${formatDate(created)} at ${formatTime(
      created
    )}, with ID number ${_id}, was rejected as spam. If you believe this action to be in error, please <a href="${lookingGlassUri()}/complaint">file the complaint again</a> with any additional elements which may help us correct the error.</p>`,
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
