// Project Type

enum ProjectStatus {
    Active,
    Finished,
}

class Project {
    constructor(
        public id: string,
        public title: string,
        public description: string,
        public people: number,
        public status: ProjectStatus
    ) {}
}

type Listener<T> = (items: T[]) => void;

class State<T> {
    protected listeners: Listener<T>[] = [];

    addListener(listenerFn: Listener<T>) {
        this.listeners.push(listenerFn);
    }
}

// Project State Management
class ProjectState extends State<Project> {
    private projects: Project[] = [];
    private static instance: ProjectState;

    private constructor() {
        super();
    }

    static getInstance() {
        if (this.instance) {
            return this.instance;
        }

        this.instance = new ProjectState();
        return this.instance;
    }

    addProject(title: string, description: string, numOfPeople: number) {
        const newProject = new Project(
            Math.random().toString(),
            title,
            description,
            numOfPeople,
            ProjectStatus.Active
        );

        this.projects.push(newProject);

        // addProject가 발생할때 모든 listener 함수를 호출한다.
        // 이게 구독 패턴.
        for (const listenerFn of this.listeners) {
            listenerFn(this.projects.slice());
        }
    }
}

const projectState = ProjectState.getInstance();

// Validatoion
interface Validatable {
    value: string | number;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
}

function validate(validatableInput: Validatable) {
    let isValid = true;
    if (validatableInput.required) {
        isValid =
            isValid && validatableInput.value.toString().trim().length !== 0;
    }

    if (
        validatableInput.minLength != null &&
        typeof validatableInput.value === "string"
    ) {
        isValid =
            isValid &&
            validatableInput.value.trim().length >= validatableInput.minLength;
    }

    if (
        validatableInput.maxLength != null &&
        typeof validatableInput.value === "string"
    ) {
        isValid =
            isValid &&
            validatableInput.value.trim().length <= validatableInput.maxLength;
    }

    if (
        validatableInput.min != null &&
        typeof validatableInput.value === "number"
    ) {
        isValid = isValid && validatableInput.value >= validatableInput.min;
    }

    if (
        validatableInput.max != null &&
        typeof validatableInput.value === "number"
    ) {
        isValid = isValid && validatableInput.value <= validatableInput.max;
    }

    return isValid;
}

// autobind decorator
function autobind(_: any, _2: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const adjDescriptor: PropertyDescriptor = {
        configurable: true,
        get() {
            const boundFn = originalMethod.bind(this);
            return boundFn;
        },
    };

    return adjDescriptor;
}
// Component Base Class
abstract class Component<T extends HTMLElement, U extends HTMLElement> {
    templateElement: HTMLTemplateElement;
    hostElement: T;
    element: U;

    constructor(
        templateId: string,
        hostElementId: string,
        insertAtStart: boolean,
        newElementId?: string
    ) {
        this.templateElement = document.getElementById(
            templateId
        )! as HTMLTemplateElement;
        this.hostElement = document.getElementById(hostElementId)! as T;

        const importedNode = document.importNode(
            this.templateElement.content,
            true
        );
        this.element = importedNode.firstElementChild as U;
        if (newElementId) this.element.id = newElementId;

        this.attach(insertAtStart);
    }

    private attach(insertAtBeginning: boolean) {
        this.hostElement.insertAdjacentElement(
            insertAtBeginning ? "afterbegin" : "beforeend",
            this.element
        );
    }

    abstract configure(): void;
    abstract renderContent(): void;
}

// ProjectItem Class
// 여기 있는 것을 구현하자
class ProjectItem extends Component<HTMLUListElement, HTMLLIElement> {
    private singleProject: Project;
    private appendElement: HTMLUListElement;
    // private li

    constructor(project: Project, appendElement: HTMLUListElement) {
        super("single-project", "app", false, "render-list");
        this.singleProject = project;
        this.appendElement = appendElement;
    }

    renderContent() {
        const titleElement = this.element.querySelector("h2");
        if (titleElement) titleElement.innerText = this.singleProject.title!;

        const descElement = this.element.querySelector("h3");
        if (descElement) descElement.innerText = this.singleProject.description;

        const peopleElement = this.element.querySelector("p");
        if (peopleElement)
            peopleElement.innerText = String(this.singleProject.people);

        this.appendElement.append(this.element);
    }
    configure() {}
}

class ElementRender {
    listEl: HTMLUListElement;

    constructor(elementId: string) {
        this.listEl = document.getElementById(elementId)! as HTMLUListElement;
        this.clearElement();
    }

    renderElement(assignedProjects: Project[]) {
        for (const prjItem of assignedProjects) {
            const renderProjectInner = new ProjectItem(prjItem, this.listEl);
            renderProjectInner.renderContent();
        }
    }

    private clearElement() {
        this.listEl.innerHTML = "";
    }
}

// ProjectList Class
class ProjectList extends Component<HTMLDivElement, HTMLElement> {
    assignedProjects: Project[];

    constructor(private type: "active" | "finished") {
        super("project-list", "app", false, `${type}-projects`);
        this.assignedProjects = [];

        // 뭔가가 변경이 된다면 해당 함수가 호출되어야한다?
        // listener로 등록한 함수들이 모두 호출되게 된다. state의 projects가 매개변수로 들어간다.
        // 따라서 assignedProject는 state의 project로 갱신되게 되고,
        // 갱신된 정보를 가지고 rendering을 하게된다.

        this.configure();
        this.renderContent();
    }

    configure() {
        projectState.addListener((projects: Project[]) => {
            // 여기서 렌더링되는 프로젝트는 all이다.
            // 따라서, filter를 걸어줘야한다.
            const relevantProjects = projects.filter((prj) => {
                if (this.type === "active") {
                    return prj.status === ProjectStatus.Active;
                } else {
                    return prj.status === ProjectStatus.Finished;
                }
            });
            this.assignedProjects = relevantProjects;
            this.renderProjects();
        });
    }

    // add project 버튼을 눌렀을 때 rendering 되는 함수.
    private renderProjects() {
        const elementRender = new ElementRender(`${this.type}-projects-list`);
        elementRender.renderElement(this.assignedProjects);
    }

    renderContent() {
        const listId = `${this.type}-projects-list`;
        this.element.querySelector("ul")!.id = listId;
        this.element.querySelector("h2")!.textContent =
            this.type.toUpperCase() + " PROJECTS";
    }
}

// ProjectInput class
class ProjectInput extends Component<HTMLDivElement, HTMLFormElement> {
    titleInputElement: HTMLInputElement;
    descriptionInputElement: HTMLInputElement;
    peopleInputElement: HTMLInputElement;

    constructor() {
        super("project-input", "app", true, "user-input");

        this.titleInputElement = this.element.querySelector(
            "#title"
        )! as HTMLInputElement;
        this.descriptionInputElement = this.element.querySelector(
            "#description"
        )! as HTMLInputElement;
        this.peopleInputElement = this.element.querySelector(
            "#people"
        )! as HTMLInputElement;

        this.configure();
    }

    renderContent() {}

    configure() {
        // event lisnter
        this.element.addEventListener("submit", this.submitHandler);
    }

    private gatherUserInput(): [string, string, number] | void {
        const enteredTitle = this.titleInputElement.value;
        const enteredDescription = this.descriptionInputElement.value;
        const enteredPeople = this.peopleInputElement.value;

        const titleValidatable: Validatable = {
            value: enteredTitle,
            required: true,
        };

        const descriptionValidatable: Validatable = {
            value: enteredDescription,
            required: true,
            minLength: 5,
        };

        const peopleValidatable: Validatable = {
            value: +enteredPeople,
            required: true,
            min: 1,
            max: 5,
        };

        if (
            !validate(titleValidatable) ||
            !validate(descriptionValidatable) ||
            !validate(peopleValidatable)
        ) {
            alert("invalid input. please try again");
            return;
        } else {
            return [enteredTitle, enteredDescription, +enteredPeople];
        }
    }

    private clearInputs() {
        this.titleInputElement.value = "";
        this.descriptionInputElement.value = "";
        this.peopleInputElement.value = "";
    }

    @autobind
    private submitHandler(event: Event) {
        event.preventDefault();
        const userInput = this.gatherUserInput();
        if (Array.isArray(userInput)) {
            const [title, description, people] = userInput;
            projectState.addProject(title, description, people);
            this.clearInputs();
        }
    }
}

const prjInput = new ProjectInput();
const activeProjectList = new ProjectList("active");
const finisehdProjectList = new ProjectList("finished");
