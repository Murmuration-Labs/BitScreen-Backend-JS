import { formatDate, formatTime } from './util.service'
import { lookingGlassUri } from '../config'
import { Complaint } from '../entity/Complaint'

export const CreateComplaint = {
  subject: 'Thank you for submitting a complaint',
  text: 'Thank you for submitting a complaint',
  body: `<strong>Thank you for submitting a complaint</strong>`,
};

export const MarkAsSpam = {
  subject: 'Complaint has been marked as spam',
  text: ({ _id, created }: Complaint) => `Your complaint filed on ${formatDate(created)} at ${formatTime(created)}, with ID number ${_id}, was rejected as spam. If you believe this action to be in error, please file the complaint again at ${lookingGlassUri()}/complaint with any additional elements which may help us correct the error.`,
  body: ({ _id, created }: Complaint) => `<p>Your complaint filed on ${formatDate(created)} at ${formatTime(created)}, with ID number ${_id}, was rejected as spam. If you believe this action to be in error, please <a href="${lookingGlassUri()}/complaint">file the complaint again</a> with any additional elements which may help us correct the error.</p>`,
}
