package controllers

import play.api._
import play.api.mvc._
import play.api.data._
import play.api.data.Forms._

import anorm._

import models._
import views._

object GraphController extends Controller with Secured{

   /**
   * Display the graph.
   */
  def upload = IsAuthenticated { username => _ =>
    User.findByEmail(username).map { user =>
      Ok(
        html.upload(
          "Upload file to graph store",
          user
        )
      )
    }.getOrElse(Forbidden)
  }
  
  
     /**
   * Display the graph.
   */
  def d3graph(analyticsRuleId: String) = IsAuthenticated { username => _ =>
    User.findByEmail(username).map { user =>
      Ok(
        html.d3graph(
          ""+analyticsRuleId,
          user
        )
      )
    }.getOrElse(Forbidden)
  }
}