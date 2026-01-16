import { ParsedFieldItem } from "./projectTaskTemplates";

export type GeneratedTask = {
  title: string;
  dueDate: Date | null;
  requiresEmail: boolean;
  emailRecipientRole: "buyer" | "seller" | "lender" | "title_company" | null;
  tags?: string;
};

export function generateTasksFromParsed(items: ParsedFieldItem[]): GeneratedTask[] {
  const lookup = Object.fromEntries(items.map((i) => [i.field, i.value]));
  const tasks: GeneratedTask[] = [];

  const buyer = lookup["buyer_name"];
  const seller = lookup["seller_name"];
  const titleCo = lookup["title_insurance_company"] || lookup["closing_agent_company"];

  tasks.push({
    title: "Send fully executed contract to client",
    dueDate: null,
    requiresEmail: true,
    emailRecipientRole: "buyer",
    tags: "email,to:buyer,send,confirm",
  });
  tasks.push({
    title: "Confirm receipt of Lead-Based Paint pamphlet",
    dueDate: null,
    requiresEmail: false,
    emailRecipientRole: null,
    tags: "confirm,compliance",
  });
  tasks.push({
    title: "Request IRS Form W-9 from client",
    dueDate: null,
    requiresEmail: true,
    emailRecipientRole: "seller",
    tags: "email,to:seller,request,document",
  });
  tasks.push({
    title: "Confirm earnest money deposit",
    dueDate: null,
    requiresEmail: false,
    emailRecipientRole: null,
    tags: "no-email,confirm,finance",
  });
  tasks.push({
    title: "Remind client to submit loan application",
    dueDate: null,
    requiresEmail: true,
    emailRecipientRole: "buyer",
    tags: "email,to:buyer,reminder,lender",
  });
  tasks.push({
    title: "Request preliminary title commitment",
    dueDate: null,
    requiresEmail: true,
    emailRecipientRole: "title_company",
    tags: "email,to:escrow,request,title",
  });
  tasks.push({
    title: "Obtain buyer's closing disclosure",
    dueDate: null,
    requiresEmail: false,
    emailRecipientRole: null,
    tags: "review,closing",
  });
  tasks.push({
    title: "Send thank you note after closing",
    dueDate: null,
    requiresEmail: true,
    emailRecipientRole: "buyer",
    tags: "email,to:buyer,followup",
  });

  // Add dynamic review tasks for included items
  const included = lookup["included_items"];
  if (Array.isArray(included)) {
    included.forEach((item) => {
      tasks.push({
        title: `Confirm included item: ${item}`,
        dueDate: null,
        requiresEmail: false,
        emailRecipientRole: null,
        tags: "confirm,review",
      });
    });
  }

  if (buyer) {
    tasks.unshift({
      title: `Confirm Buyer: ${buyer}`,
      dueDate: null,
      requiresEmail: false,
      emailRecipientRole: null,
      tags: "confirm,buyer",
    });
  }
  if (seller) {
    tasks.unshift({
      title: `Confirm Seller: ${seller}`,
      dueDate: null,
      requiresEmail: false,
      emailRecipientRole: null,
      tags: "confirm,seller",
    });
  }
  if (titleCo) {
    tasks.push({
      title: `Coordinate with Title Company: ${titleCo}`,
      dueDate: null,
      requiresEmail: true,
      emailRecipientRole: "title_company",
      tags: "email,to:escrow,coordinate,title",
    });
  }

  return tasks;
}

