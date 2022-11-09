import { faker } from '@faker-js/faker';
import { define } from 'typeorm-seeding';
import { Complaint, ComplaintStatus } from '../../entity/Complaint';
import { FileType, Infringement } from '../../entity/Infringement';

define(
  Infringement,
  (
    fakerGenerator: typeof faker,
    context: { complaint: Complaint; cid: string }
  ) => {
    const { complaint, cid } = context;

    const infringement = new Infringement();

    infringement.complaint = complaint;
    infringement.value = cid;
    infringement.fileType =
      FileType[
        Object.keys(FileType)[
          Math.floor(Math.random() * Object.keys(FileType).length)
        ]
      ];

    infringement.accepted = false;

    if (
      [ComplaintStatus.Resolved, ComplaintStatus.UnderReview].includes(
        complaint.status
      )
    ) {
      infringement.accepted = Math.random() < 0.5;
      infringement.reason = fakerGenerator.random.words(
        Math.floor(Math.random() * 11) + 10
      );
      if (complaint.submitted) infringement.resync = true;
    }

    infringement.hostedBy = [];

    return infringement;
  }
);
