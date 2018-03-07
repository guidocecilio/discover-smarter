package controllers

import play.api._
import play.api.mvc._
import play.api.data._
import play.api.data.Forms._
import anorm._
import models._
import views._
import play.api.libs.json._

/**
 * Manage projects related operations.
 */
object Projects extends Controller with Secured {

    
  implicit val pkWrites = new Writes[Pk[Long]] {
    def writes(id: Pk[Long]) = JsNumber(id.get)
  }
  
  implicit val pkReads = new Reads[Pk[Long]] {
    def reads(json: JsValue):JsResult[Pk[Long]] = {
      JsSuccess(Id(json.as[Long]))
    }
  }

  /**
   * Display the dashboard.
   */
  def index = IsAuthenticated { username => _ =>
    User.findByEmail(username).map { user =>
      Ok(
        html.dashboard(
          Project.findInvolving(username), 
          Task.findTodoInvolving(username), 
          user
        )
      )
    }.getOrElse(Forbidden)
  }
  
  def build = IsAuthenticated { username => _ =>
    User.findByEmail(username).map { user =>
      Ok(
        html.build(
          Project.findInvolving(username), 
          user
        )
      )
    }.getOrElse(Forbidden)
  }
  


  // -- Projects

  /**
   * Add a project.
   */
  def add = IsAuthenticated { username => implicit request =>{
    Logger.info("I am in project controller")
	Form("group" -> nonEmptyText).bindFromRequest.fold(
		errors => BadRequest,
		folder => {
			val project = Project.create(Project(NotAssigned, folder, "New project"), Seq(username),Seq.empty)
			Ok(views.html.items.projectitem(project))        
		})
	}
  }
 
  /**
   * Delete a project.
   */
  def delete(project: Long) = IsMemberOf(project) { username => _ =>
    Project.delete(project)
    Ok
  }

  /**
   * Rename a project.
   */
  def rename(project: Long) = IsMemberOf(project) { _ => implicit request =>
    Form("name" -> nonEmptyText).bindFromRequest.fold(
      errors => BadRequest,
      newName => { 
        Project.rename(project, newName) 
        Ok(newName) 
      }
    )
  }
  
  /**
   * 
   */
  def listProjects = Action { 
    val projects = Project.findAll
    Ok(Json.toJson(projects))
  }

  // -- Project groups

  /**
   * Add a new project group.
   */
  def addGroup = IsAuthenticated { _ => _ =>
    Ok(html.items.projectgroupitem("New group"))
  }

  /**
   * Delete a project group.
   */
  def deleteGroup(folder: String) = IsAuthenticated { _ => _ =>
    Project.deleteInFolder(folder)
    Ok
  }

  /**
   * Rename a project group.
   */
  def renameGroup(folder: String) = IsAuthenticated { _ => implicit request =>
    Form("name" -> nonEmptyText).bindFromRequest.fold(
      errors => BadRequest,
      newName => { Project.renameFolder(folder, newName); Ok(newName) }
    )
  }

  // -- Members

  /**
   * Add a project member.
   */
  def addUser(project: Long) = IsMemberOf(project) { _ => implicit request =>
    Form("user" -> nonEmptyText).bindFromRequest.fold(
      errors => BadRequest,
      user => { Project.addMember(project, user); Ok }
    )
  }

  /**
   * Remove a project member.
   */
  def removeUser(project: Long) = IsMemberOf(project) { _ => implicit request =>
    Form("user" -> nonEmptyText).bindFromRequest.fold(
      errors => BadRequest,
      user => { Project.removeMember(project, user); Ok }
    )
  }
  

  implicit val projectWrites = new Writes[Project] {
    def writes(project: Project) = Json.obj(
      "id" -> project.id,
      "folder" -> project.folder,
      "name" -> project.name
    )
  }

 
}

